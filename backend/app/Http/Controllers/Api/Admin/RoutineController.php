<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Routine;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RoutineController extends Controller
{
    /** Day order used for stable sorting across the module. */
    private const DAY_ORDER = [
        'Saturday' => 1, 'Sunday' => 2, 'Monday' => 3, 'Tuesday' => 4,
        'Wednesday' => 5, 'Thursday' => 6, 'Friday' => 7,
    ];

    /** The editable days shown in the timetable. */
    private const TIMETABLE_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    /**
     * Load the draft working set for a batch.
     *
     * The admin always edits exactly one set of rows (the draft). If a batch
     * has published rows but no draft yet, the published rows are cloned into
     * a draft set once (inside a transaction) so editing never collides with
     * the live published copy. Archived rows are preserved untouched for a
     * future version-history feature.
     *
     * Returns: { days: { day: [cells] }, status: {hasDraft,hasPublished,lastPublishedAt} }
     */
    public function index(Request $request)
    {
        $batchId = $request->query('batch_id');
        if (!$batchId) {
            return response()->json(['days' => [], 'status' => $this->emptyStatus()]);
        }

        $shift  = $request->query('shift');
        $status = $request->query('status', 'draft');

        if ($status === 'published') {
            $this->ensurePublishedExists($batchId);
        } else {
            $this->ensureDraftExists($batchId);
        }

        $query = Routine::forBatch($batchId);

        if ($status === 'published') {
            $query->where('status', 'published');
        } else {
            $query->where('status', 'draft');
        }

        if ($shift) {
            $query->where('shift', $shift);
        }

        $days = $query
            ->orderByRaw($this->dayOrderSql())
            ->orderByRaw('LENGTH(time_slot)')
            ->orderBy('time_slot')
            ->get()
            ->groupBy('day');

        return response()->json([
            'days'   => $days,
            'status' => $this->statusFor($batchId),
        ]);
    }

    /**
     * Distinct academic-metadata values across all routines, used to populate
     * the admin filter bar dropdowns.
     */
    public function meta(Request $request)
    {
        $base = Routine::query();
        if ($batchId = $request->query('batch_id')) {
            $base->forBatch($batchId);
        }

        $columns = ['academic_year', 'session', 'department', 'program', 'semester', 'section', 'shift'];
        $meta = [];
        foreach ($columns as $col) {
            $meta[$col] = $base->clone()
                ->whereNotNull($col)
                ->where($col, '!=', '')
                ->distinct()
                ->pluck($col)
                ->sort()
                ->values();
        }

        return response()->json($meta);
    }

    /**
     * Create a new routine cell (status from request, defaults to draft).
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->validationRules());

        $validated['batch_id'] = $request->input('batch_id');
        $validated['status']   = $request->input('status', 'draft');
        $validated['updated_by'] = Auth::id();

        $routine = Routine::create($validated);
        return response()->json($routine, 201);
    }

    /**
     * Update an existing routine cell (draft working set only).
     */
    public function update(Request $request, $id)
    {
        $routine = Routine::findOrFail($id);

        $validated = $request->validate($this->validationRules(true));
        $validated['updated_by'] = Auth::id();

        $routine->update($validated);
        return response()->json($routine->fresh());
    }

    /**
     * Bulk save — replaces the entire draft working set for a batch (Save Draft).
     * Expects { batch_id, cells: [{ day, time_slot, subject, teacher, room, lab, notes, ... }] }
     * Optional academic-meta fields on the request are applied to every cell.
     */
    public function saveAll(Request $request)
    {
        $request->validate([
            'batch_id' => 'required|exists:batches,id',
            'cells'    => 'required|array',
            'cells.*.day'       => 'required|in:' . implode(',', self::TIMETABLE_DAYS),
            'cells.*.time_slot' => 'nullable|string|max:50',
        ]);

        $batchId = $request->batch_id;
        $userId  = Auth::id();
        $status  = $request->input('status', 'draft');
        $shift   = $request->input('shift');

        // Shared academic context applied to every cell.
        $meta = array_filter($request->only([
            'academic_year', 'session', 'department', 'program', 'semester', 'section', 'shift',
        ]), fn ($v) => is_string($v) && $v !== '');

        DB::transaction(function () use ($request, $batchId, $userId, $meta, $status, $shift) {
            $query = Routine::forBatch($batchId)->where('status', $status);
            if ($shift) {
                $query->where('shift', $shift);
            }
            $query->delete();

            $inserts = [];
            $now = now();
            foreach ($request->cells as $cell) {
                $subject = trim((string) ($cell['subject'] ?? ''));
                $teacher = trim((string) ($cell['teacher'] ?? ''));
                $room    = trim((string) ($cell['room'] ?? ''));
                $lab     = trim((string) ($cell['lab'] ?? ''));
                $notes   = trim((string) ($cell['notes'] ?? ''));
                $cellShift = trim((string) ($cell['shift'] ?? ''));

                // Skip fully-empty cells so the table stays clean.
                if ($subject === '' && $teacher === '' && $room === '' && $lab === '' && $notes === '') {
                    continue;
                }

                $inserts[] = array_merge([
                    'batch_id'   => $batchId,
                    'day'        => $cell['day'],
                    'time_slot'  => $cell['time_slot'] ?? null,
                    'shift'      => $cellShift ?: null,
                    'subject'    => $subject,
                    'teacher'    => $teacher,
                    'room'       => $room,
                    'lab'        => $lab,
                    'notes'      => $notes,
                    'status'     => $status,
                    'updated_by' => $userId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $meta);
            }

            if (!empty($inserts)) {
                Routine::insert($inserts);
            }
        });

        $scope = $status === 'published' ? 'published' : 'draft';

        return response()->json([
            'days'   => Routine::forBatch($batchId)->{$scope}()
                ->orderByRaw($this->dayOrderSql())
                ->orderByRaw('LENGTH(time_slot)')
                ->orderBy('time_slot')
                ->get()->groupBy('day'),
            'status' => $this->statusFor($batchId),
        ]);
    }

    /**
     * Publish — archive the previous published version, then clone the current
     * draft into a published version. The draft is kept so the admin can keep
     * editing; students only ever see published rows.
     */
    public function publish(Request $request)
    {
        $request->validate(['batch_id' => 'required|exists:batches,id']);
        $batchId = $request->batch_id;
        $userId  = Auth::id();

        DB::transaction(function () use ($batchId, $userId) {
            // Archive the previously published version.
            Routine::forBatch($batchId)->published()->update([
                'status'     => 'archived',
                'updated_by' => $userId,
            ]);

            // Clone current draft -> published.
            $drafts = Routine::forBatch($batchId)->draft()->get();
            foreach ($drafts as $draft) {
                $published = $draft->replicate(['id', 'created_at', 'updated_at']);
                $published->status = 'published';
                $published->updated_by = $userId;
                $published->save();
            }
        });

        return response()->json([
            'message' => 'Routine published successfully.',
            'status'  => $this->statusFor($batchId),
        ]);
    }

    /**
     * Unpublish — archive the live published version. Students see nothing.
     */
    public function unpublish(Request $request)
    {
        $request->validate(['batch_id' => 'required|exists:batches,id']);
        $batchId = $request->batch_id;

        Routine::forBatch($batchId)->published()->update([
            'status'     => 'archived',
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Routine unpublished.',
            'status'  => $this->statusFor($batchId),
        ]);
    }

    /**
     * Rename a time slot across the draft working set for a batch.
     */
    public function renameTimeSlot(Request $request)
    {
        $request->validate([
            'batch_id' => 'required|exists:batches,id',
            'old_slot' => 'required|string|max:50',
            'new_slot' => 'required|string|max:50',
        ]);

        $oldSlot = $request->old_slot;
        $newSlot = trim($request->new_slot);

        if ($oldSlot === $newSlot) {
            return response()->json(['message' => 'No change.']);
        }

        Routine::forBatch($request->batch_id)->draft()
            ->where('time_slot', $oldSlot)
            ->update(['time_slot' => $newSlot, 'updated_by' => Auth::id()]);

        return response()->json(['message' => 'Time slot renamed.']);
    }

    /**
     * Delete a single routine cell.
     */
    public function destroy($id)
    {
        $routine = Routine::findOrFail($id);
        $routine->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    /**
     * Student view — returns ONLY published routines for the logged-in
     * student's current batch, plus a header label. Auto-detected from the
     * student profile; no manual selection required.
     */
    public function myRoutine(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)
            ->with(['batch.course', 'admission.course'])
            ->first();

        if (!$student) {
            return response()->json(['days' => [], 'label' => null]);
        }

        $batchId = $student->current_batch_id;

        // Fallback: if current_batch_id isn't set (e.g. older students),
        // try to find the first batch for the course the student applied to.
        if (!$batchId && $student->admission) {
            $batch = \App\Models\Batch::where('course_id', $student->admission->course_id)->first();
            $batchId = $batch?->id;
        }

        if (!$batchId) {
            return response()->json(['days' => [], 'label' => null]);
        }

        $rows = Routine::forBatch($batchId)->published()
            ->orderByRaw($this->dayOrderSql())
            ->orderByRaw('LENGTH(time_slot)')
            ->orderBy('time_slot')
            ->get();

        // Group by shift first, then by day — each shift becomes its own table.
        $shifts = $rows->groupBy(fn ($item) => $item->shift ?: 'Morning')
            ->map(fn ($group) => $group->groupBy('day'));

        $batch = $student->batch;

        // If the student's current_batch_id was null, $batch will be null even
        // though we resolved a fallback batchId — load it explicitly for the label.
        if (!$batch) {
            $batch = \App\Models\Batch::with('course')->find($batchId);
        }

        $label = collect(array_filter([
            $batch?->course?->title,
            $batch?->name,
        ]))->implode(' · ');

        // Pull a representative academic context for the header (from any published row).
        $sample = Routine::forBatch($batchId)->published()->first();
        $meta = $sample ? $sample->only([
            'department', 'program', 'semester', 'section', 'shift', 'academic_year', 'session',
        ]) : [];

        return response()->json([
            'shifts' => $shifts,
            'label'  => $label ?: null,
            'meta'   => $meta,
        ]);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /**
     * Guarantee a draft working set exists for a batch. If only published (or
     * nothing) exists, clone published into draft so there is exactly one
     * editable set of rows.
     */
    private function ensureDraftExists(int $batchId): void
    {
        $hasDraft = Routine::forBatch($batchId)->draft()->exists();
        if ($hasDraft) {
            return;
        }

        DB::transaction(function () use ($batchId) {
            $published = Routine::forBatch($batchId)->published()->get();
            foreach ($published as $row) {
                $draft = $row->replicate(['id', 'created_at', 'updated_at']);
                $draft->status = 'draft';
                $draft->save();
            }
        });
    }

    /**
     * Guarantee a published set exists for a batch. If only drafts exist,
     * clone them into published so there is a live set to edit.
     */
    private function ensurePublishedExists(int $batchId): void
    {
        $hasPublished = Routine::forBatch($batchId)->published()->exists();
        if ($hasPublished) {
            return;
        }

        DB::transaction(function () use ($batchId) {
            $drafts = Routine::forBatch($batchId)->draft()->get();
            foreach ($drafts as $row) {
                $published = $row->replicate(['id', 'created_at', 'updated_at']);
                $published->status = 'published';
                $published->save();
            }
        });
    }

    private function statusFor(int $batchId): array
    {
        return [
            'hasDraft'      => Routine::forBatch($batchId)->draft()->exists(),
            'hasPublished'  => Routine::forBatch($batchId)->published()->exists(),
            'lastPublishedAt' => Routine::forBatch($batchId)
                ->where('status', '!=', 'draft')
                ->max('updated_at'),
        ];
    }

    private function emptyStatus(): array
    {
        return ['hasDraft' => false, 'hasPublished' => false, 'lastPublishedAt' => null];
    }

    private function dayOrderSql(): string
    {
        $cases = [];
        foreach (self::DAY_ORDER as $day => $rank) {
            $cases[] = "WHEN '{$day}' THEN {$rank}";
        }
        return 'CASE day ' . implode(' ', $cases) . ' ELSE 99 END';
    }

    private function validationRules(bool $forUpdate = false): array
    {
        $required = $forUpdate ? 'sometimes' : 'required';
        return [
            'batch_id'      => ($forUpdate ? 'sometimes' : 'required') . '|exists:batches,id',
            'day'           => "{$required}|in:" . implode(',', self::TIMETABLE_DAYS),
            'time_slot'     => 'nullable|string|max:50',
            'subject'       => 'nullable|string',
            'teacher'       => 'nullable|string|max:255',
            'room'          => 'nullable|string|max:255',
            'lab'           => 'nullable|string|max:255',
            'notes'         => 'nullable|string',
            'academic_year' => 'nullable|string|max:50',
            'session'       => 'nullable|string|max:50',
            'department'    => 'nullable|string|max:100',
            'program'       => 'nullable|string|max:150',
            'semester'      => 'nullable|string|max:50',
            'section'       => 'nullable|string|max:50',
            'shift'         => 'nullable|string|max:50',
        ];
    }
}

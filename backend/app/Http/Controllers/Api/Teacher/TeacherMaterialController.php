<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudyMaterial;
use App\Models\TeacherBatchAssignment;

class TeacherMaterialController extends Controller
{
    public function index(Request $request)
    {
        $teacher = $request->user();
        
        $materials = StudyMaterial::where('uploaded_by', $teacher->id)
            ->with(['batch.course', 'uploader.teacher_profile'])
            ->latest()
            ->paginate(20);

        return response()->json($materials);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'batch_id' => 'required|exists:batches,id',
            'subject' => 'required|string|max:255',
            'file' => 'required|file|mimes:pdf,doc,docx,ppt,pptx,zip,jpg,jpeg,png|max:204800',
        ]);

        $teacher = $request->user();
        
        // Verify teacher has access to this batch
        $hasAccess = TeacherBatchAssignment::where('teacher_id', $teacher->id)
            ->where('batch_id', $validated['batch_id'])
            ->exists();

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized access to this batch'], 403);
        }

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('study_materials', 'public');
        }

        $material = StudyMaterial::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'batch_id' => $validated['batch_id'],
            'subject' => $validated['subject'],
            'file_path' => $path,
            'uploaded_by' => $teacher->id,
        ]);

        return response()->json([
            'message' => 'Material uploaded successfully',
            'material' => $material->load(['batch.course', 'uploader.teacher_profile'])
        ]);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'file' => 'sometimes|file|mimes:pdf,doc,docx,ppt,pptx,zip,jpg,jpeg,png|max:204800',
        ]);

        $teacher = $request->user();
        
        $material = StudyMaterial::findOrFail($id);

        // Verify teacher owns this material
        if ($material->uploaded_by !== $teacher->id) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        if (isset($validated['title'])) {
            $material->title = $validated['title'];
        }
        if (isset($validated['description'])) {
            $material->description = $validated['description'];
        }
        if ($request->hasFile('file')) {
            // Delete old file
            if ($material->file_path) {
                $oldPath = storage_path('app/public/' . $material->file_path);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
            $path = $request->file('file')->store('study_materials', 'public');
            $material->file_path = $path;
        }

        $material->save();

        return response()->json([
            'message' => 'Material updated successfully',
            'material' => $material->load(['batch.course', 'uploader.teacher_profile'])
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $teacher = $request->user();
        
        $material = StudyMaterial::findOrFail($id);

        // Verify teacher owns this material
        if ($material->uploaded_by !== $teacher->id) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        // Delete file
        if ($material->file_path) {
            $path = storage_path('app/public/' . $material->file_path);
            if (file_exists($path)) {
                unlink($path);
            }
        }

        $material->delete();

        return response()->json(['message' => 'Material deleted successfully']);
    }
}

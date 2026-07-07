<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Routine;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoutineController extends Controller
{
    public function index(Request $request)
    {
        $batchId = $request->query('batch_id');
        if(!$batchId) return response()->json([]);

        return Routine::where('batch_id', $batchId)
            ->orderByRaw("FIELD(day, 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')")
            ->orderBy('start_time')
            ->get()
            ->groupBy('day');
    }

    public function store(Request $request)
    {
        $request->validate([
            'batch_id' => 'required',
            'day' => 'required',
            'subject' => 'required',
            'start_time' => 'required',
            'end_time' => 'required',
        ]);

        Routine::create($request->all());
        return response()->json(['message' => 'Class added to routine!']);
    }

    // 🔥 নতুন: রুটিন এডিট করার ফাংশন
    public function update(Request $request, $id)
    {
        $routine = Routine::findOrFail($id);
        
        $request->validate([
            'subject' => 'required',
            'start_time' => 'required',
            'end_time' => 'required',
        ]);

        $routine->update($request->all());
        return response()->json(['message' => 'Routine updated successfully!']);
    }

    public function destroy($id)
    {
        Routine::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    public function myRoutine()
    {
        $user = Auth::user();
        $student = Student::where('user_id', $user->id)->first();

        if (!$student || !$student->current_batch_id) {
            return response()->json([]); 
        }

        return Routine::where('batch_id', $student->current_batch_id)
            ->orderByRaw("FIELD(day, 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')")
            ->orderBy('start_time')
            ->get()
            ->groupBy('day');
    }
}
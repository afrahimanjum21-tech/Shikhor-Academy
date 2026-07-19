<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return Batch::with('course')->latest()->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'course_id' => 'required|exists:courses,id',
            'start_time' => 'nullable',
            'end_time' => 'nullable',
            'capacity' => 'nullable|integer'
        ]);

        Batch::create($validated);
        return response()->json(['message' => 'Batch created successfully']);
    }

    public function update(Request $request, $id)
    {
        $batch = Batch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required',
            'course_id' => 'required|exists:courses,id',
            'start_time' => 'nullable',
            'end_time' => 'nullable',
            'capacity' => 'nullable|integer'
        ]);

        $batch->update($validated);
        return response()->json(['message' => 'Batch updated successfully']);
    }

    public function destroy($id)
    {
        Batch::findOrFail($id)->delete();
        return response()->json(['message' => 'Batch deleted successfully']);
    }
}
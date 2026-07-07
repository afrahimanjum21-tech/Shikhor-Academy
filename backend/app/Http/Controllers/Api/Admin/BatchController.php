<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function index()
    {
        return Batch::with('course')->latest()->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required', // যেমন: Batch-A
            'course_id' => 'required|exists:courses,id',
            'start_time' => 'nullable',
            'end_time' => 'nullable',
            'capacity' => 'nullable|integer'
        ]);

        Batch::create($request->all());
        return response()->json(['message' => 'Batch created successfully']);
    }

    public function update(Request $request, $id)
    {
        $batch = Batch::findOrFail($id);
        $batch->update($request->all());
        return response()->json(['message' => 'Batch updated successfully']);
    }

    public function destroy($id)
    {
        Batch::findOrFail($id)->delete();
        return response()->json(['message' => 'Batch deleted successfully']);
    }
}
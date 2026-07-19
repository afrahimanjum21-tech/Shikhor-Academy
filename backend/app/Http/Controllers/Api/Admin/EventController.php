<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicEvent;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return AcademicEvent::orderBy('date', 'asc')->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required',
            'date' => 'required|date',
            'type' => 'required|in:holiday,exam,event',
        ]);

        AcademicEvent::create($validated);
        return response()->json(['message' => 'Event Added Successfully']);
    }

    public function destroy($id)
    {
        AcademicEvent::findOrFail($id)->delete();
        return response()->json(['message' => 'Event Deleted']);
    }
}
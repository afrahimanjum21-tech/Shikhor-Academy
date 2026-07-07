<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicEvent;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index()
    {
        return AcademicEvent::orderBy('date', 'asc')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required',
            'date' => 'required|date',
            'type' => 'required|in:holiday,exam,event',
        ]);

        AcademicEvent::create($request->all());
        return response()->json(['message' => 'Event Added Successfully']);
    }

    public function destroy($id)
    {
        AcademicEvent::findOrFail($id)->delete();
        return response()->json(['message' => 'Event Deleted']);
    }
}
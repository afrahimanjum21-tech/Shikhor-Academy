<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    // পাবলিক: সব নোটিশ দেখাও
    public function index()
    {
        return Notice::orderBy('date', 'desc')->get();
    }

    // অ্যাডমিন: নোটিশ তৈরি
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required',
            'description' => 'required',
            'type' => 'required',
            'date' => 'required|date'
        ]);

        Notice::create($request->all());
        return response()->json(['message' => 'Notice posted successfully']);
    }

    // অ্যাডমিন: ডিলিট
    public function destroy($id)
    {
        Notice::findOrFail($id)->delete();
        return response()->json(['message' => 'Notice deleted']);
    }
}
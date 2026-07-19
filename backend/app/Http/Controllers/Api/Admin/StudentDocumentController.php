<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class StudentDocumentController extends Controller
{
    private function findStudentByUserId($userId)
    {
        return Student::where('user_id', $userId)->firstOrFail();
    }

    public function index($userId)
    {
        $student = $this->findStudentByUserId($userId);
        return response()->json($student->documents()->latest()->get());
    }

    public function store(Request $request, $userId)
    {
        $student = $this->findStudentByUserId($userId);

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'file' => 'required|file|max:51200',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->extension();
        $mimeType = $file->getMimeType();

        $filename = 'doc_' . time() . '_' . Str::random(10) . '.' . $extension;
        $destinationPath = public_path('uploads/student_documents');

        if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
        }

        $file->move($destinationPath, $filename);

        $relativePath = 'uploads/student_documents/' . $filename;

        $document = $student->documents()->create([
            'name' => $request->name,
            'type' => $request->type,
            'file_path' => $relativePath,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
        ]);

        return response()->json($document, 201);
    }

    public function destroy($userId, $documentId)
    {
        $student = $this->findStudentByUserId($userId);
        $document = $student->documents()->findOrFail($documentId);

        $filePath = public_path($document->file_path);
        if ($document->file_path && File::exists($filePath)) {
            File::delete($filePath);
        }

        $document->delete();
        return response()->json(['message' => 'Document deleted']);
    }

    public function studentDocuments(Request $request)
    {
        $user = $request->user();
        $student = $user->student_profile;

        if (!$student) {
            return response()->json([], 200);
        }

        return response()->json($student->documents()->latest()->get());
    }
}

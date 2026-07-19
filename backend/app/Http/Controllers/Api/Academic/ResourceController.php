<?php
namespace App\Http\Controllers\Api\Academic;

use App\Http\Controllers\Controller;
use App\Models\StudyMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ResourceController extends Controller
{
    public function publicIndex(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return StudyMaterial::with('uploader.teacher_profile')->latest()->paginate($perPage);
    }

    public function uploadMaterial(Request $request)
    {
        if (!$request->has('title') || !$request->has('type')) {
            return response()->json(['message' => 'Missing title or type'], 400);
        }

        $data = [
            'title' => $request->input('title'),
            'type' => $request->input('type'),
            'created_at' => now(),
            'updated_at' => now()
        ];

        if ($request->input('type') === 'file') {
            $request->validate([
                'file' => 'required|file|max:51200',
            ]);

            $file = $request->file('file');

            $filename = 'doc_' . time() . '_' . rand(1000, 9999) . '.' . $file->extension();
            $destinationPath = public_path('uploads/materials');

            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
            }

            $file->move($destinationPath, $filename);

            $data['file_path'] = 'uploads/materials/' . $filename;
            $data['file_type'] = $file->extension();
            $data['url'] = null;
        } else {
            $data['url'] = $request->input('url');
            $data['file_path'] = null;
            $data['file_type'] = 'link';
        }

        DB::table('study_materials')->insert($data);

        return response()->json(['message' => 'Material added successfully']);
    }
    
    public function destroy($id)
    {
        $material = DB::table('study_materials')->where('id', $id)->first();
        
        if ($material && $material->type === 'file' && $material->file_path) {
            $filePath = public_path($material->file_path);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        DB::table('study_materials')->where('id', $id)->delete();
        return response()->json(['message' => 'Material deleted']);
    }
}
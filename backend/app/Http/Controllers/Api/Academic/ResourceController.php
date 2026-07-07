<?php
namespace App\Http\Controllers\Api\Academic;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ResourceController extends Controller
{
    public function publicIndex()
    {
        return DB::table('study_materials')->latest()->get();
    }

    public function uploadMaterial(Request $request)
    {
        // টাইটেল বা টাইপ না থাকলে এরর
        if (!$request->has('title') || !$request->has('type')) {
            return response()->json(['message' => 'Missing title or type'], 400);
        }

        $data = [
            'title' => $request->input('title'),
            'type' => $request->input('type'),
            'created_at' => now(),
            'updated_at' => now()
        ];

        try {
            if ($request->input('type') === 'file') {
                
                // ১. পিএইচপি গ্লোবাল ভেরিয়েবল চেক (Laravel Bypass)
                if (!isset($_FILES['file'])) {
                    throw new \Exception("No file received. Server might have blocked it due to size limit.");
                }

                // ২. পিএইচপি এরর কোড চেক (আসল সমস্যা এখানে ধরা পড়বে)
                $errorCode = $_FILES['file']['error'];
                if ($errorCode !== UPLOAD_ERR_OK) {
                    $errorMessages = [
                        1 => 'File exceeds upload_max_filesize in php.ini',
                        2 => 'File exceeds MAX_FILE_SIZE directive',
                        3 => 'File partially uploaded',
                        4 => 'No file uploaded',
                        6 => 'Missing temporary folder',
                        7 => 'Failed to write file to disk',
                        8 => 'A PHP extension stopped the file upload',
                    ];
                    $errorMsg = isset($errorMessages[$errorCode]) ? $errorMessages[$errorCode] : "Unknown Upload Error Code: $errorCode";
                    throw new \Exception($errorMsg);
                }

                $tmpName = $_FILES['file']['tmp_name'];
                $originalName = $_FILES['file']['name'];
                $ext = pathinfo($originalName, PATHINFO_EXTENSION);
                
                // ৩. ইংরেজি নাম তৈরি
                $filename = 'doc_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
                
                // ৪. ফোল্ডার পাথ (সরাসরি Public)
                $uploadDir = public_path('uploads/materials');
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $destination = $uploadDir . '/' . $filename;

                // ৫. ফাইল মুভ করা
                if (move_uploaded_file($tmpName, $destination)) {
                    $data['file_path'] = 'uploads/materials/' . $filename;
                    $data['file_type'] = $ext;
                    $data['url'] = null;
                } else {
                    throw new \Exception("Failed to move file. Permission denied.");
                }

            } else {
                $data['url'] = $request->input('url');
                $data['file_path'] = null;
                $data['file_type'] = 'link';
            }

            // ৬. ডাটাবেসে সেভ
            DB::table('study_materials')->insert($data);

            return response()->json(['message' => 'Material added successfully']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
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
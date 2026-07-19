<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\GalleryImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class GalleryController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(5, min((int) $request->input('per_page', 15), 100));
        return Album::with('images')->latest()->paginate($perPage);
    }

    public function storeAlbum(Request $request)
    {
        $request->validate(['name' => 'required']);
        
        $dbPath = null; // ডিফল্ট ভ্যালু

        if($request->hasFile('thumbnail')){
            $file = $request->file('thumbnail');
            
            // ১. ফাইলের নাম তৈরি
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // ২. ফোল্ডার আছে কিনা চেক করা, না থাকলে বানানো
            $destinationPath = storage_path('app/public/gallery');
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
            }

            // ৩. ফাইলটি সরাসরি মুভ করা (Force Move)
            $file->move($destinationPath, $filename);
            
            // ৪. ডেটাবেসের জন্য পাথ সেট করা
            $dbPath = 'gallery/' . $filename;
        }
        
        return Album::create(['name' => $request->name, 'thumbnail' => $dbPath]);
    }

    public function uploadImages(Request $request, Album $album)
    {
        $request->validate(['image' => 'required|image']);

        if($request->hasFile('image')) {
            $file = $request->file('image');
            
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $destinationPath = storage_path('app/public/gallery');
            
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
            }

            $file->move($destinationPath, $filename);
            $dbPath = 'gallery/' . $filename;
            
            $album->images()->create(['image_path' => $dbPath]);
        }
        return response()->json(['message' => 'Image uploaded']);
    }
    
    public function destroyAlbum($id) {
        $album = Album::findOrFail($id);
        
        // Delete thumbnail file
        if ($album->thumbnail) {
            $thumbnailPath = storage_path('app/public/' . $album->thumbnail);
            if (File::exists($thumbnailPath)) {
                File::delete($thumbnailPath);
            }
        }
        
        // Delete all images and their files
        foreach ($album->images as $image) {
            if ($image->image_path) {
                $imagePath = storage_path('app/public/' . $image->image_path);
                if (File::exists($imagePath)) {
                    File::delete($imagePath);
                }
            }
            $image->delete();
        }
        
        $album->delete();
        return response()->json(['message' => 'Album deleted']);
    }

    public function destroyImage($albumId, $imageId) {
        $image = \App\Models\GalleryImage::where('album_id', $albumId)->findOrFail($imageId);
        
        // ফাইল মুছে ফেলা
        if ($image->image_path) {
            $filePath = storage_path('app/public/' . $image->image_path);
            if (File::exists($filePath)) File::delete($filePath);
        }
        
        $image->delete();
        return response()->json(['message' => 'Image deleted']);
    }
}
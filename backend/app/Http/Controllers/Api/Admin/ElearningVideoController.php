<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ElearningVideo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ElearningVideoController extends Controller
{
    /**
     * সব ভিডিও লিস্ট (Admin এর জন্য — locked/ inactive সব)
     */
    public function index()
    {
        return ElearningVideo::orderBy('sort_order')->latest()->get();
    }

    /**
     * নতুন ভিডিও তৈরি
     * - video_url থেকে platform + video_id অটো-পার্স হয়
     * - কাস্টম thumbnail আপলোড করা না হলে, platform এর ডিফল্ট thumbnail ব্যবহার হবে
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'title'         => 'required|string|max:255',
            'description'   => 'nullable|string',
            'teacher'       => 'nullable|string|max:255',
            'duration'      => 'nullable|string|max:50',
            'video_url'     => 'required|string',
            'is_locked'     => 'nullable|boolean',
            'is_active'     => 'nullable|boolean',
            'sort_order'    => 'nullable|integer',
            'thumbnail'     => 'nullable|image',   // কাস্টম থাম্বনেইল (ঐচ্ছিক)
        ]);

        // লিংক থেকে platform ও video_id বের করি
        $parsed = $this->parseVideoUrl($data['video_url']);
        $data['platform'] = $parsed['platform'];
        $data['video_id'] = $parsed['video_id'];

        // কাস্টম thumbnail আপলোড
        $data['thumbnail_path'] = $this->handleThumbnailUpload($request);

        // Facebook ভিডিওর জন্য auto-fetch OG image (যদি কাস্টম thumbnail না থাকে)
        if (!$data['thumbnail_path'] && $parsed['platform'] === 'facebook' && $data['video_url']) {
            $data['thumbnail_path'] = $this->fetchOgImage($data['video_url']);
        }

        unset($data['thumbnail']);

        return ElearningVideo::create($data);
    }

    /**
     * একটি ভিডিও আপডেট
     */
    public function update(Request $request, $id)
    {
        $video = ElearningVideo::findOrFail($id);

        $data = $request->validate([
            'title'             => 'sometimes|required|string|max:255',
            'description'       => 'nullable|string',
            'teacher'           => 'nullable|string|max:255',
            'duration'          => 'nullable|string|max:50',
            'video_url'         => 'sometimes|required|string',
            'is_locked'         => 'nullable|boolean',
            'is_active'         => 'nullable|boolean',
            'sort_order'        => 'nullable|integer',
            'thumbnail'         => 'nullable|image',
            'remove_thumbnail'  => 'nullable|boolean',
        ]);

        // লিংক বদলালে আবার parse করতে হবে
        if (isset($data['video_url'])) {
            $parsed = $this->parseVideoUrl($data['video_url']);
            $data['platform'] = $parsed['platform'];
            $data['video_id'] = $parsed['video_id'];
        }

        // নতুন thumbnail এলে আগেরটা মুছে নতুনটা রাখি
        if ($request->hasFile('thumbnail')) {
            $this->deleteThumbnailFile($video->thumbnail_path);
            $data['thumbnail_path'] = $this->handleThumbnailUpload($request);
        }
        // অ্যাডমিন "Remove" চাইলে → ফাইল মুছে DB-তে null
        elseif (filter_var($request->input('remove_thumbnail'), FILTER_VALIDATE_BOOLEAN)) {
            $this->deleteThumbnailFile($video->thumbnail_path);
            $data['thumbnail_path'] = null;
        }

        unset($data['thumbnail'], $data['remove_thumbnail']);

        $video->update($data);
        return $video->fresh();
    }

    /**
     * ভিডিও ডিলিট — কাস্টম thumbnail থাকলে ফাইলও মুছে ফেলি
     */
    public function destroy($id)
    {
        $video = ElearningVideo::findOrFail($id);
        $this->deleteThumbnailFile($video->thumbnail_path);
        $video->delete();
        return response()->json(['message' => 'Video deleted']);
    }

    // ===================================================================
    //  PUBLIC ENDPOINT — সবার জন্য visible ভিডিও
    // ===================================================================
    public function publicIndex()
    {
        return ElearningVideo::where('is_active', true)
            ->orderBy('sort_order')
            ->latest()
            ->get();
    }

    // ===================================================================
    //  হেল্পার মেথডসমূহ
    // ===================================================================

    /**
     * YouTube / Facebook লিংক থেকে platform ও video_id বের করে।
     *
     * YouTube:
     *   - https://www.youtube.com/watch?v=VIDEO_ID
     *   - https://youtu.be/VIDEO_ID
     *   - https://www.youtube.com/embed/VIDEO_ID
     *   - https://m.youtube.com/watch?v=VIDEO_ID
     *
     * Facebook:
     *   - https://www.facebook.com/watch?v=VIDEO_ID
     *   - https://www.facebook.com/PAGE/videos/VIDEO_ID
     *   - https://fb.watch/SHORTCODE/   (খুব ছোট কোড — embed-এ কাজ করবে না, তাই লিংক হিসেবেই রাখি)
     */
    private function parseVideoUrl(string $url): array
    {
        $url = trim($url);

        // ---------- YOUTUBE ----------
        if (preg_match('#(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|v/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{6,})#', $url, $m)) {
            return ['platform' => 'youtube', 'video_id' => $m[1]];
        }
        // সাধারণ youtube ডোমেন কিন্তু ID ধরা পড়েনি
        if (stripos($url, 'youtube.com') !== false || stripos($url, 'youtu.be') !== false) {
            return ['platform' => 'youtube', 'video_id' => null];
        }

        // ---------- FACEBOOK ----------
        if (stripos($url, 'facebook.com') !== false || stripos($url, 'fb.watch') !== false) {
            // /videos/NUMBER/  বা  watch?v=NUMBER  প্যাটার্ন
            if (preg_match('#/videos/(?:pg:\w+/)?(\d{5,})#', $url, $m)) {
                return ['platform' => 'facebook', 'video_id' => $m[1]];
            }
            if (preg_match('#watch\?(?:.*&)?v=(\d{5,})#', $url, $m)) {
                return ['platform' => 'facebook', 'video_id' => $m[1]];
            }
            // fb.watch শর্টকোড — ID নয়, embed করা যায় না; লিংক হিসেবে রাখি
            return ['platform' => 'facebook', 'video_id' => null];
        }

        // অন্য কিছু হলে unknown ধরি
        return ['platform' => 'unknown', 'video_id' => null];
    }

    /**
     * কাস্টম thumbnail ফাইল আপলোড করে storage path ফেরত দেয়।
     * ফাইল না থাকলে null রিটার্ন করে (তখন frontend platform ডিফল্ট thumbnail ব্যবহার করবে)।
     */
    private function handleThumbnailUpload(Request $request): ?string
    {
        if (!$request->hasFile('thumbnail')) {
            return null;
        }
        $file = $request->file('thumbnail');
        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $destinationPath = storage_path('app/public/elearning');
        if (!File::exists($destinationPath)) {
            File::makeDirectory($destinationPath, 0755, true, true);
        }
        $file->move($destinationPath, $filename);
        return 'elearning/' . $filename;
    }

    /**
     * কাস্টম thumbnail ফাইল ডিস্ক থেকে মুছে ফেলে।
     */
    private function deleteThumbnailFile(?string $path): void
    {
        if (!$path) return;
        $full = storage_path('app/public/' . $path);
        if (File::exists($full)) File::delete($full);
    }

    /**
     * Facebook ভিডিও URL থেকে OG image auto-fetch করে স্টোর করে।
     * সার্ভার-সাইডে একবারই চলে (ভিডিও তৈরি/আপডেটের সময়) — ক্যাশেড।
     */
    private function fetchOgImage(string $url): ?string
    {
        try {
            $response = Http::timeout(5)->withOptions(['verify' => false])->get($url);
            if (!$response->successful()) return null;

            $html = $response->body();
            libxml_use_internal_errors(true);
            $doc = new \DOMDocument();
            $doc->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
            libxml_clear_errors();

            $metas = $doc->getElementsByTagName('meta');
            $ogImage = null;
            foreach ($metas as $meta) {
                if ($meta->getAttribute('property') === 'og:image') {
                    $ogImage = $meta->getAttribute('content');
                    break;
                }
            }

            if (!$ogImage) return null;

            $imgResponse = Http::timeout(5)->withOptions(['verify' => false])->get($ogImage);
            if (!$imgResponse->successful()) return null;

            $ext = 'jpg';
            $filename = 'fb_' . time() . '_' . Str::random(10) . '.' . $ext;
            $destinationPath = storage_path('app/public/elearning');
            if (!File::exists($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true, true);
            }
            File::put($destinationPath . '/' . $filename, $imgResponse->body());

            return 'elearning/' . $filename;
        } catch (\Exception $e) {
            \Log::warning('Failed to fetch Facebook OG image: ' . $e->getMessage());
            return null;
        }
    }
}

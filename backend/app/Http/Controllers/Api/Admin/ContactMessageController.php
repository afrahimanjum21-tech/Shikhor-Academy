<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function index(Request $request)
    {
        $query = ContactMessage::latest();

        if ($request->query('unread') === 'true') {
            $query->unread();
        }

        return response()->json(
            $query->paginate($request->query('per_page', 20))
        );
    }

    public function trashed(Request $request)
    {
        $expireAfterDays = 30;

        $messages = ContactMessage::onlyTrashed()
            ->where('deleted_at', '>=', now()->subDays($expireAfterDays))
            ->latest('deleted_at')
            ->paginate($request->query('per_page', 20));

        $messages->getCollection()->transform(function ($msg) use ($expireAfterDays) {
            $msg->permanent_delete_at = $msg->deleted_at->addDays($expireAfterDays);
            return $msg;
        });

        return response()->json($messages);
    }

    public function show($id)
    {
        $message = ContactMessage::findOrFail($id);
        $message->markAsRead();
        return response()->json($message);
    }

    public function markAsRead($id)
    {
        $message = ContactMessage::findOrFail($id);
        $message->markAsRead();
        return response()->json(['message' => 'Marked as read.']);
    }

    public function markAllAsRead()
    {
        $updated = ContactMessage::unread()->update(['is_read' => true]);
        return response()->json(['message' => "{$updated} messages marked as read."]);
    }

    public function destroy($id)
    {
        $message = ContactMessage::withTrashed()->findOrFail($id);
        $message->delete();
        return response()->json(['message' => 'Message deleted.']);
    }

    public function restore($id)
    {
        $message = ContactMessage::onlyTrashed()->findOrFail($id);
        $message->restore();
        return response()->json(['message' => 'Message restored.']);
    }

    public function forceDelete($id)
    {
        $message = ContactMessage::onlyTrashed()->findOrFail($id);
        $message->forceDelete();
        return response()->json(['message' => 'Message permanently deleted.']);
    }
}

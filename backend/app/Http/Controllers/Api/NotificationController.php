<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = Notification::where('user_id', $request->user()->id)->latest();

        if ($request->query('unread') === 'true') {
            $query->unread();
        }

        if ($request->query('type')) {
            $query->ofType($request->query('type'));
        }

        $notifications = $query->paginate($request->query('per_page', 20));

        $unreadCount = Notification::where('user_id', $request->user()->id)->unread()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)->unread()->count();
        return response()->json(['count' => $count]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->markAsRead();
        return response()->json(['message' => 'Marked as read.']);
    }

    public function markAllAsRead(Request $request)
    {
        $updated = Notification::where('user_id', $request->user()->id)->unread()
            ->update(['read_at' => now()]);
        return response()->json(['message' => "{$updated} notifications marked as read."]);
    }

    public function markReadByType(Request $request)
    {
        $request->validate(['type' => 'required|string']);

        $updated = Notification::where('user_id', $request->user()->id)
            ->where('type', $request->type)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => "{$updated} notifications marked as read.",
            'marked_count' => $updated,
        ]);
    }

    public function recentActivity(Request $request)
    {
        $query = Notification::where('user_id', $request->user()->id)
            ->where('created_at', '>=', now()->subDays(30));

        $oldest = (clone $query)->oldest()->first();

        $notifications = $query->latest()
            ->limit(10)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => $n->id,
                    'type' => $n->type,
                    'icon' => $n->icon,
                    'title' => $n->title,
                    'body' => $n->body,
                    'action_url' => $n->action_url,
                    'level' => $n->level,
                    'is_read' => !is_null($n->read_at),
                    'created_at' => $n->created_at,
                    'time_ago' => $n->created_at->diffForHumans(),
                ];
            });

        return response()->json([
            'items' => $notifications,
            'oldest_created_at' => $oldest?->created_at,
        ]);
    }
}

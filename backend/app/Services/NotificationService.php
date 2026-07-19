<?php
namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public static function createForAdmins(
        string $type,
        string $title,
        ?string $body = null,
        ?string $actionUrl = null,
        ?string $actionLabel = null,
        string $level = 'info',
        ?string $icon = null
    ): void {
        $admins = User::whereIn('role', ['admin', 'super_admin'])->get();
        foreach ($admins as $admin) {
            self::create($admin->id, $type, $title, $body, $actionUrl, $actionLabel, $level, $icon);
        }
    }

    public static function create(
        int $userId,
        string $type,
        string $title,
        ?string $body = null,
        ?string $actionUrl = null,
        ?string $actionLabel = null,
        string $level = 'info',
        ?string $icon = null
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'icon' => $icon ?? self::defaultIcon($type),
            'title' => $title,
            'body' => $body,
            'action_url' => $actionUrl,
            'action_label' => $actionLabel,
            'level' => $level,
        ]);
    }

    public static function defaultIcon(string $type): string
    {
        return match ($type) {
            'admission' => '📋',
            'payment' => '💰',
            'message' => '✉️',
            'notice' => '📢',
            'routine' => '📅',
            'attendance' => '✅',
            'leave' => '📝',
            'assignment' => '📚',
            'exam' => '📝',
            'material' => '📄',
            'event' => '🎉',
            default => '🔔',
        };
    }
}

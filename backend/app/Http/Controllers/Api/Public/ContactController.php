<?php
namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function submit(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'email' => 'required|email',
            'subject' => 'required',
            'message' => 'required'
        ]);

        DB::table('contacts')->insert([
            'name' => $request->name,
            'email' => $request->email,
            'subject' => $request->subject,
            'phone' => $request->phone,
            'message' => $request->message,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        NotificationService::createForAdmins(
            'message',
            'New Message',
            "{$request->name} sent a message: {$request->subject}",
            '/admin/contact-messages',
            'View',
            'info',
            '✉️'
        );

        $emailDelivered = false;

        try {
            $settings = SiteSetting::instance();

            // In dev/testing, skip placeholder addresses to avoid sending to sample data
            $isPlaceholder = function ($email) {
                if (!str_ends_with((string) $email, '@uttoron.com')) {
                    return false;
                }
                if (app()->environment('local', 'testing')) {
                    return true;
                }
                Log::warning("ContactController: placeholder email configured in non-dev environment", ['email' => $email]);
                return false;
            };

            $recipients = User::whereIn('role', ['admin', 'super_admin'])
                ->pluck('email')
                ->filter(fn ($e) => filled($e) && !$isPlaceholder($e))
                ->values()
                ->toArray();

            // If no valid admin emails, fall back to SMTP from-address
            if (empty($recipients)) {
                if (filled($settings->smtp_from_address) && !$isPlaceholder($settings->smtp_from_address)) {
                    $recipients[] = $settings->smtp_from_address;
                } elseif (filled(env('MAIL_FROM_ADDRESS'))) {
                    $recipients[] = env('MAIL_FROM_ADDRESS');
                }
            }

            // Also add the configured messages_email if it's a real address
            $configured = $settings->messages_email;
            if (filled($configured) && !$isPlaceholder($configured)) {
                $recipients[] = $configured;
            }

            $recipients = array_unique($recipients);

            if (empty($recipients)) {
                return response()->json([
                    'message' => 'Message saved, but no recipient email is configured.',
                ], 500);
            }

            SiteSetting::applySmtpConfig();

            $phone = $request->phone ?: 'N/A';
            $body = "You have received a new message from the Contact form.\n\n"
                  . "Name: {$request->name}\n"
                  . "Email: {$request->email}\n"
                  . "Phone: {$phone}\n"
                  . "Subject: {$request->subject}\n\n"
                  . "Message:\n{$request->message}\n";

            Mail::raw($body, function ($mail) use ($request, $recipients) {
                $mail->to($recipients)
                     ->subject('New Contact Message: ' . $request->subject)
                     ->replyTo($request->email, $request->name);
            });

            $emailDelivered = true;
        } catch (\Exception $e) {
            Log::error("Contact message email failed: " . $e->getMessage());
        }

        if (!$emailDelivered) {
            return response()->json([
                'message' => 'Message saved, but email delivery failed. Please check SMTP settings.',
            ], 500);
        }

        return response()->json(['message' => 'Message sent successfully!']);
    }
}

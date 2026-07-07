<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

// মেইল টেস্টিং রাউট
Route::get('/test-mail', function () {
    try {
        // আপনার নিজের আরেকটি ইমেইল এখানে লিখুন (যেখানে মেইল যাবে)
        $to_email = 'আপনার_আসল_জিমেইল@gmail.com'; 
        
        Mail::raw('Hi! This is a test email from Uttoron Coaching System. If you are reading this, configuration is 100% correct.', function ($message) use ($to_email) {
            $message->to($to_email)
                    ->subject('Test Email - Success!');
        });

        return "Email Sent Successfully! ✅ Check your Inbox or Spam folder.";

    } catch (\Exception $e) {
        // এরর হলে স্ক্রিনে দেখাবে
        return "Mail Failed! ❌ Error: " . $e->getMessage();
    }
});
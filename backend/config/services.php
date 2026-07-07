<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | SSLCommerz Payment Gateway
    |--------------------------------------------------------------------------
    | Sandbox (test) credentials are the default. Set SSLCOMMERZ_MODE=live
    | and provide real store credentials in .env for production.
    */
    'sslcommerz' => [
        'store_id'      => env('SSLCOMMERZ_STORE_ID', 'test_box'),
        'store_passwd'  => env('SSLCOMMERZ_STORE_PASS', 'qwerty'),
        'mode'          => env('SSLCOMMERZ_MODE', 'sandbox'), // sandbox | live
        'success_url'   => env('SSLCOMMERZ_SUCCESS_URL', env('APP_URL', 'http://localhost:8000') . '/api/student/payment/success'),
        'failed_url'    => env('SSLCOMMERZ_FAILED_URL', env('APP_URL', 'http://localhost:8000') . '/api/student/payment/failed'),
        'cancel_url'    => env('SSLCOMMERZ_CANCEL_URL', env('APP_URL', 'http://localhost:8000') . '/api/student/payment/cancel'),
        'ipn_url'       => env('SSLCOMMERZ_IPN_URL', env('APP_URL', 'http://localhost:8000') . '/api/student/payment/ipn'),
        'frontend_success_url' => env('PAYMENT_FRONTEND_SUCCESS_URL', env('FRONTEND_URL', 'http://localhost:5173') . '/payment/success'),
        'frontend_failed_url'  => env('PAYMENT_FRONTEND_FAILED_URL', env('FRONTEND_URL', 'http://localhost:5173') . '/payment/failed'),
        'frontend_cancel_url'  => env('PAYMENT_FRONTEND_CANCEL_URL', env('FRONTEND_URL', 'http://localhost:5173') . '/payment/cancelled'),
    ],

];

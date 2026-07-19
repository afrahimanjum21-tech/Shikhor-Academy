<?php

$frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
$corsOrigins = env('CORS_ALLOWED_ORIGINS');

$origins = $corsOrigins
    ? array_map('trim', explode(',', $corsOrigins))
    : array_filter([$frontendUrl]);

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => in_array(env('APP_ENV', 'production'), ['local', 'testing'])
        ? ['/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/']
        : [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
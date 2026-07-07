<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // সুপার অ্যাডমিন সব জায়গায় যেতে পারবে
        if ($request->user()->role === 'super_admin') {
            return $next($request);
        }

        // বাকিদের রোল চেক করা হবে
        if (! in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Unauthorized Access.'], 403);
        }

        return $next($request);
    }
}
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AttachRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->headers->get('X-Request-ID') ?: (string) Str::uuid();
        $request->headers->set('X-Request-ID', $requestId);

        $response = $next($request);
        $response->headers->set('X-Request-ID', $requestId);

        if ($request->is('api/*')) {
            Log::info('platform_api_request_completed', [
                'service' => 'loadpath-meridian-platform',
                'request_id' => $requestId,
                'method' => $request->method(),
                'path' => $request->path(),
                'status_code' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}

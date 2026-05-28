import { CORS_HEADERS } from './cors.ts';

export function jsonOk(data: unknown, traceId: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
      'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
    },
  });
}

export function jsonError(
  code: string,
  message: string,
  traceId: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({ error: { code, message, trace_id: traceId } }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
        'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
      },
    },
  );
}

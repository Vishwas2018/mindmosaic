export function jsonOk(data: unknown, traceId: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "X-Trace-Id": traceId },
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
    { status, headers: { "Content-Type": "application/json", "X-Trace-Id": traceId } },
  );
}

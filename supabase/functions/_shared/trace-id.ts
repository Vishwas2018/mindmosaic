export function getTraceId(req: Request): string {
  return req.headers.get("X-Trace-Id") ?? crypto.randomUUID();
}

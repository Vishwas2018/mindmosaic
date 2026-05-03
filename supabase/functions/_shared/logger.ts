export interface LogFields {
  level: "info" | "warn" | "error";
  service: string;
  trace_id: string;
  tenant_id?: string;
  user_id?: string;
  endpoint: string;
  status_code: number;
  duration_ms: number;
  error_code?: string;
}

export function log(fields: LogFields): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...fields }));
}

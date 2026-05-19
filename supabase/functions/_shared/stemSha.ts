function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = sortKeys(obj[k]);
    return acc;
  }, {});
}

export function normaliseStem(stem: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(stem)).trim();
}

export async function stemSha(stem: Record<string, unknown>): Promise<string> {
  const encoded = new TextEncoder().encode(normaliseStem(stem));
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

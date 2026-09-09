import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function signSession(expires: string) {
  return createHmac('sha256', process.env.RESEARCH_PASSWORD || 'disabled')
    .update(`research:${expires}`)
    .digest('hex');
}
export async function isResearcher() {
  if (!process.env.RESEARCH_PASSWORD) return false;
  const token = (await cookies()).get('memory-research')?.value;
  if (!token) return false;
  const [expires, sig] = token.split('.');
  return (
    Number(expires) > Date.now() &&
    !!sig &&
    safeEqual(sig, signSession(expires))
  );
}

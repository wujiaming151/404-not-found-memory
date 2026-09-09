import { NextResponse } from 'next/server';
import { safeEqual, signSession } from '@/lib/auth';
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  const password = process.env.RESEARCH_PASSWORD;
  if (!password)
    return NextResponse.json({ error: 'passwordMissing' }, { status: 503 });
  const ip = request.headers.get('x-forwarded-for') || 'local';
  const now = Date.now();
  const state = attempts.get(ip);
  if (state && state.until > now && state.count >= 5)
    return NextResponse.json({ error: 'rateLimit' }, { status: 429 });
  try {
    const body = await request.json();
    if (
      typeof body.password !== 'string' ||
      !safeEqual(body.password, password)
    ) {
      attempts.set(ip, {
        count: state && state.until > now ? state.count + 1 : 1,
        until: now + 600000,
      });
      return NextResponse.json({ error: 'wrongPassword' }, { status: 401 });
    }
    attempts.delete(ip);
    const expires = String(now + 8 * 60 * 60 * 1000);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      'memory-research',
      `${expires}.${signSession(expires)}`,
      {
        httpOnly: true,
        sameSite: 'strict',
        secure: new URL(request.url).protocol === 'https:',
        maxAge: 8 * 60 * 60,
        path: '/',
      },
    );
    return response;
  } catch {
    return NextResponse.json({ error: 'invalidRequest' }, { status: 400 });
  }
}
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('memory-research');
  return response;
}

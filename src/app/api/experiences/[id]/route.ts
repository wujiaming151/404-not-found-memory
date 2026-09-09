import { NextResponse } from 'next/server';
import { getExperience } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const e = await getExperience(id);
  return e
    ? NextResponse.json(e)
    : NextResponse.json({ error: 'missingExperience' }, { status: 404 });
}

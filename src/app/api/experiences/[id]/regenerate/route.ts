import { NextResponse } from 'next/server';
import { db, getExperience } from '@/lib/db';
import { generateFragrance } from '@/lib/fragrance';
export const runtime = 'nodejs';
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const e = getExperience(id);
  if (!e)
    return NextResponse.json({ error: 'missingExperience' }, { status: 404 });
  const fragrance = generateFragrance(
    e.analysis,
    (e.variants?.length || 0) + 1,
  );
  fragrance.name = e.title;
  fragrance.english = e.title;
  db()
    .prepare(
      'INSERT INTO variants(experience_id,created_at,payload) VALUES(?,?,?)',
    )
    .run(id, new Date().toISOString(), JSON.stringify(fragrance));
  return NextResponse.json(fragrance);
}

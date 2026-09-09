import { NextResponse } from 'next/server';
import { addVariant, getExperience } from '@/lib/db';
import { generateFragrance } from '@/lib/fragrance';
export const runtime = 'nodejs';
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const e = await getExperience(id);
  if (!e)
    return NextResponse.json({ error: 'missingExperience' }, { status: 404 });
  const fragrance = generateFragrance(
    e.analysis,
    (e.variants?.length || 0) + 1,
  );
  fragrance.name = e.title;
  fragrance.english = e.title;
  await addVariant(id, fragrance);
  return NextResponse.json(fragrance);
}

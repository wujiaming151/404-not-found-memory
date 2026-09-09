import { particleParameters } from '@/lib/particles/parameters';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PNG } from 'pngjs';
import { db, getExperience } from '@/lib/db';
import { analyzePixels } from '@/lib/analysis';
import { generateFragrance } from '@/lib/fragrance';
import type { Experience } from '@/lib/types';
export const runtime = 'nodejs';
const input = z.object({
  id: z.uuid(),
  participantId: z.string().regex(/^M-[A-Z0-9-]{4,40}$/),
  title: z.string().trim().min(1).max(80),
  image: z.string().max(8_000_000).startsWith('data:image/png;base64,'),
  demo: z.boolean(),
  sourceId: z.uuid().optional(),
});
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 8_500_000)
      return NextResponse.json({ error: 'imageTooLarge' }, { status: 413 });
    const body = await request.text();
    if (body.length > 8_500_000)
      return NextResponse.json({ error: 'imageTooLarge' }, { status: 413 });
    const value = input.parse(JSON.parse(body));
    const exists = getExperience(value.id);
    if (exists) return NextResponse.json(exists);
    const bytes = Buffer.from(value.image.split(',')[1], 'base64');
    if (
      bytes.length < 24 ||
      bytes.readUInt32BE(16) > 2048 ||
      bytes.readUInt32BE(20) > 2048
    )
      throw Error('invalidImage');
    const png = PNG.sync.read(bytes, { checkCRC: true });
    const w = 256,
      h = 192,
      pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p =
          (Math.floor((y / h) * png.height) * png.width +
            Math.floor((x / w) * png.width)) *
          4;
        pixels.set(png.data.subarray(p, p + 4), (y * w + x) * 4);
      }
    const analysis = analyzePixels(pixels, w, h);
    if (!analysis.colors.length)
      return NextResponse.json({ error: 'emptySubmission' }, { status: 400 });
    const fragrance = generateFragrance(analysis);
    fragrance.name = value.title;
    fragrance.english = value.title;
    const experience: Experience = {
      id: value.id,
      participantId: value.participantId,
      title: value.title,
      image: `/api/experiences/${value.id}/image`,
      analysis,
      fragrance,
      createdAt: new Date().toISOString(),
      demo: value.demo,
      sourceId: value.sourceId,
      visual: { seed: 42, ...particleParameters(analysis) },
    };
    db()
      .prepare(
        'INSERT INTO experiences(id,participant_id,created_at,title,demo,image,payload) VALUES(?,?,?,?,?,?,?)',
      )
      .run(
        experience.id,
        experience.participantId,
        experience.createdAt,
        experience.title,
        Number(experience.demo),
        bytes,
        JSON.stringify(experience),
      );
    return NextResponse.json(experience, { status: 201 });
  } catch (error) {
    console.error(
      'Submission failed',
      error instanceof Error ? error.message : 'invalid request',
    );
    return NextResponse.json({ error: 'submissionError' }, { status: 400 });
  }
}

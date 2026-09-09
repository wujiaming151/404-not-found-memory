import { NextResponse } from 'next/server';
import { isResearcher } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Experience } from '@/lib/types';
function csv(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export async function GET(request: Request) {
  if (!(await isResearcher()))
    return NextResponse.json({ error: 'loginRequired' }, { status: 401 });
  const url = new URL(request.url),
    q = url.searchParams.get('q') || '',
    from = url.searchParams.get('from') || '',
    to = url.searchParams.get('to') || '9999',
    demo = url.searchParams.get('demo') === '1';
  const rows = db()
    .prepare(
      'SELECT payload FROM experiences WHERE participant_id LIKE ? AND created_at>=? AND created_at<=? AND (?=1 OR demo=0) ORDER BY created_at DESC',
    )
    .all(`%${q}%`, from, to + 'T23:59:59.999Z', Number(demo)) as {
    payload: string;
  }[];
  const records = rows.map((r) => JSON.parse(r.payload) as Experience);
  if (url.searchParams.get('format') === 'csv') {
    const header = [
      'id',
      'participant_id',
      'submitted_at',
      'title',
      'demo',
      'image',
      'brightness',
      'saturation',
      'warm',
      'cool',
      'neutral',
      'whitespace',
      'complexity',
      'colors',
      'visual',
      'analysis_version',
      'fragrance_name',
      'fragrance_type',
      'top',
      'middle',
      'base',
      'ratios',
      'rule_version',
      'seed',
    ];
    const lines = records.flatMap((e) => {
      const variants = db()
        .prepare(
          'SELECT payload FROM variants WHERE experience_id=? ORDER BY id',
        )
        .all(e.id) as { payload: string }[];
      return [e.fragrance, ...variants.map((v) => JSON.parse(v.payload))].map(
        (f) =>
          [
            e.id,
            e.participantId,
            e.createdAt,
            e.title,
            e.demo,
            e.image,
            e.analysis.brightness,
            e.analysis.saturation,
            e.analysis.warm,
            e.analysis.cool,
            e.analysis.neutral,
            e.analysis.whitespace,
            e.analysis.complexity,
            JSON.stringify(e.analysis.colors),
            JSON.stringify(e.visual),
            e.analysis.version,
            f.name,
            f.type,
            f.top.join(' / '),
            f.middle.join(' / '),
            f.base.join(' / '),
            JSON.stringify(f.ratios),
            f.version,
            f.seed,
          ]
            .map(csv)
            .join(','),
      );
    });
    return new Response('\uFEFF' + [header.join(','), ...lines].join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="memory-research.csv"',
      },
    });
  }
  return NextResponse.json(records);
}

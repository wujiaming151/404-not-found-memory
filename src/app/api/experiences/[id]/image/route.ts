import { db } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = db()
    .prepare('SELECT image FROM experiences WHERE id=?')
    .get(id) as { image: Uint8Array } | undefined;
  return row
    ? new Response(new Uint8Array(row.image), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=86400',
        },
      })
    : new Response('Not found', { status: 404 });
}

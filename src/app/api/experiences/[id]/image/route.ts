import { getExperienceImage } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getExperienceImage(id);
  return image
    ? new Response(image, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=86400',
        },
      })
    : new Response('Not found', { status: 404 });
}

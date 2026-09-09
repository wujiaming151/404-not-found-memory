import { Suspense } from 'react';
import { MemoryGuide } from '@/components/MemoryGuide';
export default async function Draw({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string }>;
}) {
  const { guide } = await searchParams;
  return (
    <Suspense fallback={<div className="notice shell" role="progressbar" />}>
      <MemoryGuide enabled={guide === '1'} />
    </Suspense>
  );
}

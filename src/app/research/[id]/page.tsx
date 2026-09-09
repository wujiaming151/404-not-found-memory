import { redirect } from 'next/navigation';
import { isResearcher } from '@/lib/auth';
import { ResultView } from '@/components/ResultView';
export default async function ResearchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isResearcher())) redirect('/research/login');
  const { id } = await params;
  return <ResultView id={id} />;
}

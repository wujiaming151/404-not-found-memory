import { AnalysisSequence } from '@/components/AnalysisSequence';
export default async function Analyzing({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalysisSequence id={id} />;
}

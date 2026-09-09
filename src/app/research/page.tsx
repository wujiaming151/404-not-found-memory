import { redirect } from 'next/navigation';
import { isResearcher } from '@/lib/auth';
import { Research } from '@/components/Research';
export const dynamic = 'force-dynamic';
export default async function ResearchPage() {
  if (!(await isResearcher())) redirect('/research/login');
  return <Research />;
}

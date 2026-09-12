import { Landing } from '@/components/Landing';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
export default function Home() {
  const imagePaths = [
    '/assets/project-concept.webp',
    '/assets/drawing-process.webp',
    '/assets/visual-olfactory-process.webp',
  ];
  return (
    <Landing
      availableImages={imagePaths.filter((src) =>
        existsSync(join(process.cwd(), 'public', src.slice(1))),
      )}
    />
  );
}

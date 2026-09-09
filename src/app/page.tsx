import { Landing } from '@/components/Landing';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
export default function Home() {
  const imagePaths = [
    '/images/project-concept.jpg',
    '/images/drawing-process.jpg',
    '/images/visual-olfactory-process.jpg',
  ];
  return (
    <Landing
      availableImages={imagePaths.filter((src) =>
        existsSync(join(process.cwd(), 'public', src.slice(1))),
      )}
    />
  );
}

import { defineConfig } from 'vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import { cdnAdapter } from '@vinext/cloudflare/cache/cdn-adapter';
import { fileURLToPath } from 'node:url';

const cloudflareDb = fileURLToPath(
  new URL('./src/lib/db.cloudflare.ts', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      '@/lib/db': cloudflareDb,
    },
  },
  plugins: [
    {
      name: 'cloudflare-database-adapter',
      enforce: 'pre',
      resolveId(source) {
        if (source === '@/lib/db') return cloudflareDb;
      },
      transform(code, id) {
        if (id.includes('/src/') && code.includes('@/lib/db')) {
          return code.replaceAll('@/lib/db', '@/lib/db.cloudflare');
        }
      },
    },
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
});

import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'hermes/skills/tuanxue-assistant/references');
const check = process.argv.includes('--check');
const server = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { SEED_DOCS } = await server.ssrLoadModule('/src/data/seed.ts');
  if (!check) await mkdir(directory, { recursive: true });
  for (const doc of SEED_DOCS) {
    const destination = path.join(directory, `${doc.id}.md`);
    if (check) {
      if (await readFile(destination, 'utf8') !== doc.content) throw new Error(`示例资料不一致：${doc.id}`);
    } else await writeFile(destination, doc.content, 'utf8');
  }
  console.log(`${check ? 'Verified' : 'Exported'} ${SEED_DOCS.length} references from src/data/seed.ts`);
} finally { await server.close(); }

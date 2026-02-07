/**
 * Vercel serverless entry. All requests are rewritten here so the full
 * Hono + React Router app (including /api/auth) handles them.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let handlerCache = null;

export default async function handler(req, res) {
  if (!handlerCache) {
    const vercelPath = pathToFileURL(path.join(__dirname, '../build/server/vercel.js')).href;
    const mod = await import(vercelPath);
    handlerCache = mod.default;
  }
  return handlerCache(req, res);
}

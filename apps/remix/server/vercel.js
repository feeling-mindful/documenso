/**
 * Vercel serverless entry. Receives Node req/res, converts to Fetch API,
 * passes to the Hono + React Router handler, then writes the response.
 *
 * This file is copied to build/server/vercel.js during build.
 * Used when deploying to Vercel so /api/auth and all routes hit the same app.
 */

import handle from 'hono-react-router-adapter/node';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function nodeRequestToFetchRequest(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const url = `${protocol}://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value));
  }
  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const raw = await readBody(req);
    if (raw.length > 0) body = raw;
  }
  return new Request(url, { method: req.method, headers, body });
}

async function sendFetchResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}

let handlerPromise = null;

async function getHandler() {
  if (handlerPromise) return handlerPromise;
  handlerPromise = (async () => {
    const server = (await import('./hono/server/router.js')).default;
    const build = await import('./index.js');
    return handle(build, server);
  })();
  return handlerPromise;
}

export default async function vercelHandler(req, res) {
  try {
    const app = await getHandler();
    const request = await nodeRequestToFetchRequest(req);
    const response = await app.fetch(request);
    await sendFetchResponse(res, response);
  } catch (err) {
    console.error('[Vercel handler]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error');
  }
}

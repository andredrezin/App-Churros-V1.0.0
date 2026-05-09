import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _server = null;

async function getServer() {
  if (!_server) {
    const { default: s } = await import(
      resolve(__dirname, "../dist/server/server.js")
    );
    _server = s;
  }
  return _server;
}

export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = new URL(req.url, `${proto}://${host}`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body =
    req.method !== "GET" && req.method !== "HEAD" && chunks.length
      ? Buffer.concat(chunks)
      : undefined;

  const webReq = new Request(url, { method: req.method, headers, body });

  const server = await getServer();
  const response = await server.fetch(webReq, {}, {});

  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

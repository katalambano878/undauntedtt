import { createHash } from "crypto";
import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import sharp from "sharp";
import { resolveObjectPath, guessContentType } from "@/lib/db/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_WIDTH = 2000;
const DEFAULT_QUALITY = 72;

function etagFor(size: number, mtimeMs: number, variant: string): string {
  return `"${createHash("sha1").update(`${size}:${mtimeMs}:${variant}`).digest("hex")}"`;
}

function parseWidth(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 16) return null;
  return Math.min(Math.round(n), MAX_WIDTH);
}

async function serveDerived(
  fullPath: string,
  bucket: string,
  objectPath: string,
  width: number,
  quality: number,
  acceptWebp: boolean
): Promise<{ bytes: Buffer; contentType: string; variant: string }> {
  const format = acceptWebp ? "webp" : "jpeg";
  const variant = `w${width}_q${quality}.${format}`;
  const derivedRel = path.join(".derived", `w${width}_q${quality}`, bucket, `${objectPath}.${format}`);
  const derivedFull = resolveObjectPath("_cache", derivedRel);

  try {
    const cached = await fs.readFile(derivedFull);
    return {
      bytes: cached,
      contentType: format === "webp" ? "image/webp" : "image/jpeg",
      variant,
    };
  } catch {
    // generate below
  }

  const pipeline = sharp(fullPath, { failOn: "none" }).rotate().resize({
    width,
    withoutEnlargement: true,
    fit: "inside",
  });

  const bytes =
    format === "webp"
      ? await pipeline.webp({ quality, effort: 4 }).toBuffer()
      : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  await fs.mkdir(path.dirname(derivedFull), { recursive: true });
  await fs.writeFile(derivedFull, bytes).catch(() => {});

  return {
    bytes,
    contentType: format === "webp" ? "image/webp" : "image/jpeg",
    variant,
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
): Promise<Response> {
  const { bucket, path: parts } = await ctx.params;
  const objectPath = parts.map(decodeURIComponent).join("/");
  const url = new URL(req.url);
  const width = parseWidth(url.searchParams.get("w"));
  const quality = Math.min(
    90,
    Math.max(40, Number(url.searchParams.get("q") || DEFAULT_QUALITY) || DEFAULT_QUALITY)
  );
  const accept = req.headers.get("accept") || "";
  const acceptWebp = accept.includes("image/webp");

  let fullPath: string;
  try {
    fullPath = resolveObjectPath(bucket, objectPath);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let stat: { size: number; mtimeMs: number };
  try {
    const s = await fs.stat(fullPath);
    if (!s.isFile()) throw new Error("not a file");
    stat = { size: s.size, mtimeMs: s.mtimeMs };
  } catch {
    return new Response(JSON.stringify({ error: "Object not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const variant = width ? `w${width}_q${quality}` : "original";
  const etag = etagFor(stat.size, stat.mtimeMs, variant);
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const commonHeaders: Record<string, string> = {
    ETag: etag,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
  };

  // Card/list sizes — resize + WebP when requested
  if (width) {
    try {
      const derived = await serveDerived(
        fullPath,
        bucket,
        objectPath,
        width,
        quality,
        acceptWebp
      );
      return new Response(new Uint8Array(derived.bytes), {
        status: 200,
        headers: {
          ...commonHeaders,
          "Content-Type": derived.contentType,
          "Content-Length": String(derived.bytes.length),
          Vary: "Accept",
        },
      });
    } catch (err) {
      console.error("[storage] resize failed, falling back to original", err);
      // fall through to original
    }
  }

  const contentType = guessContentType(objectPath);
  const stream = createReadStream(fullPath);
  const body = Readable.toWeb(stream) as ReadableStream;

  return new Response(body, {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
    },
  });
}

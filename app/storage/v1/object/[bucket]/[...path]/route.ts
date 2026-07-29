import { NextRequest, NextResponse } from "next/server";
import { createStorageClient } from "@/lib/db/storage";
import { isPlainPostgres } from "@/lib/db/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * supabase-js Storage upload sends multipart/form-data with the file part
 * (plus optional cacheControl). Raw binary POSTs are also accepted.
 */
async function extractUploadBytes(
  req: NextRequest
): Promise<{ bytes: Buffer; contentType: string }> {
  const headerCt = (req.headers.get("content-type") || "").toLowerCase();

  if (headerCt.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const value of form.values()) {
      if (value && typeof value === "object" && "arrayBuffer" in value) {
        const file = value as File;
        const bytes = Buffer.from(await file.arrayBuffer());
        const contentType =
          file.type ||
          (typeof form.get("contentType") === "string"
            ? String(form.get("contentType"))
            : "") ||
          "application/octet-stream";
        return { bytes, contentType };
      }
    }
    throw new Error("No file found in multipart upload");
  }

  const bytes = Buffer.from(await req.arrayBuffer());
  // Guard: if someone stripped the content-type but still sent multipart
  if (bytes.length > 20 && bytes.subarray(0, 2).toString() === "--") {
    const asText = bytes.toString("latin1");
    if (asText.includes("Content-Disposition:")) {
      throw new Error(
        "Received multipart body without multipart Content-Type; refusing to store form envelope as a file"
      );
    }
  }
  return {
    bytes,
    contentType: headerCt || "application/octet-stream",
  };
}

/**
 * Supabase Storage upload:
 *   POST /storage/v1/object/{bucket}/{path}
 *   body = multipart file (supabase-js) OR raw bytes
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }

  const { bucket, path } = await ctx.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  const upsert = (req.headers.get("x-upsert") || "").toLowerCase() === "true";

  let bytes: Buffer;
  let contentType: string;
  try {
    ({ bytes, contentType } = await extractUploadBytes(req));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid upload body" },
      { status: 400 }
    );
  }

  if (!bytes.length) {
    return NextResponse.json({ error: "Empty upload" }, { status: 400 });
  }

  const storage = createStorageClient();
  const { data, error } = await storage.from(bucket).upload(objectPath, bytes, {
    contentType,
    upsert,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: pub } = storage.from(bucket).getPublicUrl(objectPath);
  // Prefer host-relative public URL so images work across domains / www
  const publicUrl = `/storage/v1/object/public/${bucket}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  return NextResponse.json({
    Key: `${bucket}/${objectPath}`,
    Id: data?.path,
    ...data,
    publicUrl: pub.publicUrl || publicUrl,
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }
  const { bucket, path } = await ctx.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  const storage = createStorageClient();
  const { error } = await storage.from(bucket).remove([objectPath]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({});
}

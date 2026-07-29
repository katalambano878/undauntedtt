/**
 * Append width/quality params for the on-the-fly storage image resizer.
 * Leaves non-storage URLs untouched.
 */
export function storageImageUrl(
  src: string | null | undefined,
  opts?: { width?: number; quality?: number }
): string {
  if (!src) return "/placeholder-product.svg";
  if (src.includes("via.placeholder.com")) return "/placeholder-product.svg";

  const isStorage =
    src.startsWith("/storage/v1/object/public/") ||
    src.includes("/storage/v1/object/public/");

  if (!isStorage || !opts?.width) return src;

  try {
    // Relative paths need a base for URL parsing
    const u = src.startsWith("http")
      ? new URL(src)
      : new URL(src, "http://local.invalid");
    u.searchParams.set("w", String(opts.width));
    if (opts.quality) u.searchParams.set("q", String(opts.quality));
    if (src.startsWith("http")) return u.toString();
    return `${u.pathname}${u.search}`;
  } catch {
    const join = src.includes("?") ? "&" : "?";
    return `${src}${join}w=${opts.width}${opts.quality ? `&q=${opts.quality}` : ""}`;
  }
}

export function isStorageImageUrl(src: string): boolean {
  return (
    src.startsWith("/storage/") ||
    src.includes("/storage/v1/object/") ||
    src.startsWith("/placeholder") ||
    src.endsWith(".svg")
  );
}

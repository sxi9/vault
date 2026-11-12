import path from "node:path";

/** Public origin used inside QR codes. No trailing slash. */
export const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Where SQLite and uploads live. Default: <app>/data (git-ignored). */
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/** Public URL for a tag code. This is what the sticker encodes. */
export function tagUrl(code: string): string {
  return `${BASE_URL}/t/${code.toLowerCase()}`;
}

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB
export const MAX_MODEL_BYTES = 80 * 1024 * 1024; // 80 MB (iPhone scans are big)
export const MODEL_EXTENSIONS = ["glb", "gltf", "usdz", "obj"] as const;
export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic"] as const;

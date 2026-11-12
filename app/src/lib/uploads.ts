// File storage for photos and 3D models. Local disk under DATA_DIR/uploads.
// To move to object storage later, replace saveUpload/readUpload only.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR } from "./config";

export function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

/** Saves bytes under a random name with the given extension. Returns the stored file name. */
export async function saveUpload(bytes: ArrayBuffer | Buffer, ext: string): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext.replace(/[^a-z0-9]/g, "")}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(bytes as ArrayBuffer));
  return name;
}

export async function removeUpload(name: string | null | undefined): Promise<void> {
  if (!name) return;
  await fs.rm(path.join(UPLOAD_DIR, safeName(name)), { force: true });
}

/** Prevents path traversal: only "<hex>.<ext>" names are served. */
export function safeName(name: string): string {
  if (!/^[a-f0-9]{24}\.[a-z0-9]{1,5}$/.test(name)) throw new Error("bad upload name");
  return name;
}

export function uploadPath(name: string): string {
  return path.join(UPLOAD_DIR, safeName(name));
}

export const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
  glb: "model/gltf-binary", gltf: "model/gltf+json", usdz: "model/vnd.usdz+zip", obj: "text/plain", mtl: "text/plain",
};

/** Public URL for a stored upload (served by /api/uploads/[name]). */
export function uploadUrl(name: string): string {
  return `/api/uploads/${name}`;
}

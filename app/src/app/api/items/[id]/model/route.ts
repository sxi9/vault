// Owner route: upload / replace / delete the 3D scan of an item.
// Protected by src/proxy.ts (everything outside /t, /api/t, /api/uploads, /login).
//
// POST   multipart  fields: model (file), mtl (file, only with .obj), public ("1" | "0")
// PATCH  json       { public: boolean }
// DELETE            removes the files and nulls the fields
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getItem, updateItem } from "@/lib/db";
import { MAX_MODEL_BYTES, MODEL_EXTENSIONS } from "@/lib/config";
import { extensionOf, removeUpload, saveUpload } from "@/lib/uploads";
import type { Item } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };
type ModelExt = (typeof MODEL_EXTENSIONS)[number];

const bad = (error: string, status = 400) => Response.json({ ok: false, error }, { status });

function isModelExt(ext: string): ext is ModelExt {
  return (MODEL_EXTENSIONS as readonly string[]).includes(ext);
}

function publicItem(item: Item) {
  return {
    ok: true,
    item: {
      id: item.id,
      model3d: item.model3d,
      model3dMtl: item.model3dMtl,
      model3dPublic: item.model3dPublic,
    },
  };
}

function revalidate(item: Item) {
  revalidatePath(`/items/${item.id}`);
  revalidatePath(`/t/${item.code.toLowerCase()}`);
  revalidatePath("/");
}

async function load(ctx: Ctx): Promise<Item | null> {
  const { id } = await ctx.params;
  return getItem(id);
}

export async function POST(req: Request, ctx: Ctx) {
  const item = await load(ctx);
  if (!item) return bad("item not found", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("expected multipart form data");
  }

  const model = form.get("model");
  if (!(model instanceof File) || model.size === 0) return bad("pick a model file");
  const ext = extensionOf(model.name);
  if (!isModelExt(ext)) return bad(`unsupported format .${ext || "?"} — use GLB, USDZ, OBJ or glTF`);
  if (model.size > MAX_MODEL_BYTES) {
    return bad(`file is too big (${(model.size / 1048576).toFixed(0)} MB, max ${MAX_MODEL_BYTES / 1048576} MB)`, 413);
  }

  const mtl = form.get("mtl");
  let mtlFile: File | null = null;
  if (mtl instanceof File && mtl.size > 0) {
    if (ext !== "obj") return bad("a .mtl file only goes with an .obj model");
    if (extensionOf(mtl.name) !== "mtl") return bad("the materials file must be a .mtl");
    if (mtl.size > MAX_MODEL_BYTES) return bad("the .mtl file is too big", 413);
    mtlFile = mtl;
  }

  const pub = form.get("public");
  const model3dPublic = pub === null ? item.model3dPublic : String(pub) === "1" || String(pub) === "true";

  const model3d = await saveUpload(await model.arrayBuffer(), ext);
  const model3dMtl = mtlFile ? await saveUpload(await mtlFile.arrayBuffer(), "mtl") : null;

  // Replace: the old files go after the new ones are safely on disk.
  await removeUpload(item.model3d);
  await removeUpload(item.model3dMtl);

  const updated = updateItem(item.id, { model3d, model3dMtl, model3dPublic });
  if (!updated) return bad("item vanished", 404);
  revalidate(updated);
  return Response.json(publicItem(updated));
}

const Patch = z.object({ public: z.boolean() });

export async function PATCH(req: Request, ctx: Ctx) {
  const item = await load(ctx);
  if (!item) return bad("item not found", 404);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("expected json");
  }
  const parsed = Patch.safeParse(body);
  if (!parsed.success) return bad("expected { public: boolean }");
  const updated = updateItem(item.id, { model3dPublic: parsed.data.public });
  if (!updated) return bad("item vanished", 404);
  revalidate(updated);
  return Response.json(publicItem(updated));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const item = await load(ctx);
  if (!item) return bad("item not found", 404);
  await removeUpload(item.model3d);
  await removeUpload(item.model3dMtl);
  const updated = updateItem(item.id, { model3d: null, model3dMtl: null, model3dPublic: false });
  if (!updated) return bad("item vanished", 404);
  revalidate(updated);
  return Response.json(publicItem(updated));
}

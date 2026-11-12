"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isOwner } from "@/lib/auth";
import { MAX_PHOTO_BYTES, PHOTO_EXTENSIONS } from "@/lib/config";
import { addEvent, createItem, deleteItem, getItem, updateItem } from "@/lib/db";
import { CATEGORIES, type Item, type Stat } from "@/lib/types";
import { extensionOf, removeUpload, saveUpload } from "@/lib/uploads";

// ---------- helpers ----------

async function requireOwner(): Promise<void> {
  if (!(await isOwner())) throw new Error("Unauthorized");
}

function field(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function requireItem(fd: FormData): Item {
  const id = field(fd, "id");
  const item = id ? getItem(id) : null;
  if (!item) throw new Error("Item not found");
  return item;
}

/** Every page that renders this item (grid, detail, tag page, feed, stickers). */
function revalidateItem(item: Pick<Item, "id" | "code">): void {
  revalidatePath("/");
  revalidatePath(`/items/${item.id}`);
  revalidatePath(`/t/${item.code.toLowerCase()}`);
  revalidatePath("/activity");
  revalidatePath("/stickers");
}

const text = (max: number) => z.string().trim().max(max);

const publicSchema = z.object({
  nickname: text(60).min(1, "Give it a nickname."),
  name: text(120).min(1, "Say what it is."),
  category: z.enum(CATEGORIES),
  finderNote: text(600),
  stat1Label: text(40),
  stat1Value: text(60),
  stat2Label: text(40),
  stat2Value: text(60),
});

const privateSchema = z.object({
  serial: text(120),
  purchaseInfo: text(300),
  privateNotes: text(2000),
});

function statsFrom(d: z.infer<typeof publicSchema>): Stat[] {
  const pairs: Stat[] = [];
  if (d.stat1Label && d.stat1Value) pairs.push({ label: d.stat1Label, value: d.stat1Value });
  if (d.stat2Label && d.stat2Value) pairs.push({ label: d.stat2Label, value: d.stat2Value });
  return pairs.slice(0, 2);
}

function pick(fd: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = field(fd, k);
  return out;
}

const PUBLIC_KEYS = ["nickname", "name", "category", "finderNote", "stat1Label", "stat1Value", "stat2Label", "stat2Value"];
const PRIVATE_KEYS = ["serial", "purchaseInfo", "privateNotes"];

const orNull = (s: string): string | null => (s.length ? s : null);

// ---------- create ----------

export async function createItemAction(formData: FormData): Promise<void> {
  await requireOwner();
  const pub = publicSchema.safeParse(pick(formData, PUBLIC_KEYS));
  const priv = privateSchema.safeParse(pick(formData, PRIVATE_KEYS));
  if (!pub.success || !priv.success) {
    const msg = pub.success ? "Private fields are too long." : pub.error.issues[0]?.message ?? "Check the form.";
    redirect(`/items/new?error=${encodeURIComponent(msg)}`);
  }
  const item = createItem({
    category: pub.data.category,
    name: pub.data.name,
    nickname: pub.data.nickname,
    finderNote: pub.data.finderNote,
    publicStats: statsFrom(pub.data),
    serial: orNull(priv.data.serial),
    purchaseInfo: orNull(priv.data.purchaseInfo),
    privateNotes: orNull(priv.data.privateNotes),
  });
  revalidateItem(item);
  redirect(`/items/${item.id}`);
}

// ---------- edit ----------

export async function updatePublicAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  const parsed = publicSchema.safeParse(pick(formData, PUBLIC_KEYS));
  if (!parsed.success) {
    redirect(`/items/${item.id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the form.")}#edit`);
  }
  // The code never changes with the category: stickers may already be printed.
  updateItem(item.id, {
    nickname: parsed.data.nickname,
    name: parsed.data.name,
    category: parsed.data.category,
    finderNote: parsed.data.finderNote,
    publicStats: statsFrom(parsed.data),
  });
  revalidateItem(item);
  redirect(`/items/${item.id}?saved=public#edit`);
}

export async function updatePrivateAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  const parsed = privateSchema.safeParse(pick(formData, PRIVATE_KEYS));
  if (!parsed.success) {
    redirect(`/items/${item.id}?error=${encodeURIComponent("Private fields are too long.")}#vault`);
  }
  updateItem(item.id, {
    serial: orNull(parsed.data.serial),
    purchaseInfo: orNull(parsed.data.purchaseInfo),
    privateNotes: orNull(parsed.data.privateNotes),
  });
  revalidatePath(`/items/${item.id}`);
  redirect(`/items/${item.id}?saved=private#vault`);
}

// ---------- photo ----------

export async function uploadPhotoAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/items/${item.id}?error=${encodeURIComponent("Choose a photo first.")}#photo`);
  }
  const ext = extensionOf(file.name);
  if (!(PHOTO_EXTENSIONS as readonly string[]).includes(ext)) {
    redirect(`/items/${item.id}?error=${encodeURIComponent(`Photos must be ${PHOTO_EXTENSIONS.join(", ")}.`)}#photo`);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    redirect(`/items/${item.id}?error=${encodeURIComponent(`Photos must be under ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB.`)}#photo`);
  }
  const stored = await saveUpload(await file.arrayBuffer(), ext);
  await removeUpload(item.photo);
  updateItem(item.id, { photo: stored });
  revalidateItem(item);
  redirect(`/items/${item.id}#photo`);
}

export async function removePhotoAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  await removeUpload(item.photo);
  updateItem(item.id, { photo: null });
  revalidateItem(item);
  redirect(`/items/${item.id}#photo`);
}

// ---------- lost / found ----------

export async function toggleLostAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  const lost = !item.lost;
  updateItem(item.id, { lost });
  addEvent({
    itemId: item.id,
    type: lost ? "lost" : "found",
    who: "You",
    text: lost ? `Reported ${item.nickname} as lost` : `${item.nickname} is back`,
  });
  revalidateItem(item);
  redirect(`/items/${item.id}#lost`);
}

// ---------- lending ----------

const lendSchema = z.object({
  lentTo: text(80).min(1, "Who has it?"),
  lentDue: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date.")
    .or(z.literal("")),
});

export async function lendAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  const parsed = lendSchema.safeParse({ lentTo: field(formData, "lentTo"), lentDue: field(formData, "lentDue") });
  if (!parsed.success) {
    redirect(`/items/${item.id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the lending form.")}#lend`);
  }
  updateItem(item.id, { lentTo: parsed.data.lentTo, lentDue: orNull(parsed.data.lentDue) });
  addEvent({
    itemId: item.id,
    type: "lend",
    who: "You",
    text: parsed.data.lentDue
      ? `Lent ${item.nickname} to ${parsed.data.lentTo}, due back ${parsed.data.lentDue}`
      : `Lent ${item.nickname} to ${parsed.data.lentTo}`,
  });
  revalidateItem(item);
  redirect(`/items/${item.id}#lend`);
}

export async function returnAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  const from = item.lentTo;
  updateItem(item.id, { lentTo: null, lentDue: null });
  addEvent({ itemId: item.id, type: "return", who: "You", text: from ? `${item.nickname} is back from ${from}` : `${item.nickname} is back` });
  revalidateItem(item);
  redirect(`/items/${item.id}#lend`);
}

// ---------- delete ----------

export async function deleteItemAction(formData: FormData): Promise<void> {
  await requireOwner();
  const item = requireItem(formData);
  deleteItem(item.id);
  revalidateItem(item);
  redirect("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isOwner } from "@/lib/auth";
import { updateOwner } from "@/lib/db";
import type { Owner } from "@/lib/types";

const schema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{1,24}$/, "Handle: letters, digits, - or _ only (max 24)."),
  name: z.string().trim().min(1, "Add your name.").max(80),
  bio: z.string().trim().max(300, "Bio is too long (300 max)."),
  contact: z.string().trim().max(160, "Contact is too long."),
  rewardLine: z.string().trim().max(140, "Reward line is too long."),
  links: z.string().max(4000),
});

/** One "label | url" per line. Lines without a valid http(s) URL are dropped. */
function parseLinks(raw: string): Owner["links"] {
  const out: Owner["links"] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const sep = t.indexOf("|");
    let label = sep >= 0 ? t.slice(0, sep).trim() : "";
    let url = sep >= 0 ? t.slice(sep + 1).trim() : t;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const ok = z.url({ protocol: /^https?$/ }).safeParse(url);
    if (!ok.success) continue;
    if (!label) label = new URL(url).hostname.replace(/^www\./, "");
    out.push({ label: label.slice(0, 40), url });
    if (out.length >= 8) break;
  }
  return out;
}

export async function updateOwnerAction(formData: FormData): Promise<void> {
  if (!(await isOwner())) throw new Error("Unauthorized");
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const parsed = schema.safeParse({
    handle: get("handle"),
    name: get("name"),
    bio: get("bio"),
    contact: get("contact"),
    rewardLine: get("rewardLine"),
    links: get("links"),
  });
  if (!parsed.success) {
    redirect(`/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the form.")}`);
  }
  updateOwner({
    handle: parsed.data.handle,
    name: parsed.data.name,
    bio: parsed.data.bio,
    contact: parsed.data.contact,
    rewardLine: parsed.data.rewardLine,
    links: parseLinks(parsed.data.links),
  });
  // The handle sits in the header of every owner page and the owner block on every tag page.
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

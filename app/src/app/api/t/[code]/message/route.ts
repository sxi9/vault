import { z } from "zod";
import { addEvent } from "@/lib/db";
import {
  contactField, finderName, honeypot, invalid, messageField, nameField, prepareFinderRequest, type FinderContext,
} from "@/lib/finder";

const Message = z.object({
  name: nameField.optional(),
  contact: contactField.optional(),
  message: messageField.pipe(z.string().min(1, "say something")),
  website: honeypot,
});

export async function POST(req: Request, ctx: FinderContext) {
  const p = await prepareFinderRequest(req, ctx);
  if (!p.ok) return p.res;
  const parsed = Message.safeParse(p.body);
  if (!parsed.success) return invalid(parsed.error);
  const { name, contact, message } = parsed.data;
  addEvent({
    itemId: p.item.id,
    type: "message",
    who: finderName(name),
    contact: contact && contact.length ? contact : null,
    text: message,
  });
  return Response.json({ ok: true });
}

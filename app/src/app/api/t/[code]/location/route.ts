import { z } from "zod";
import { addEvent } from "@/lib/db";
import {
  coord, finderName, honeypot, invalid, nameField, placeField, prepareFinderRequest, type FinderContext,
} from "@/lib/finder";

const Location = z
  .object({
    name: nameField.optional(),
    place: placeField.optional(),
    lat: coord(-90, 90),
    lng: coord(-180, 180),
    website: honeypot,
  })
  .refine((d) => (d.lat !== undefined) === (d.lng !== undefined), { message: "lat and lng go together", path: ["lat"] })
  .refine((d) => d.lat !== undefined || (d.place && d.place.length > 0), { message: "a position or a place is needed", path: ["place"] });

export async function POST(req: Request, ctx: FinderContext) {
  const p = await prepareFinderRequest(req, ctx);
  if (!p.ok) return p.res;
  const parsed = Location.safeParse(p.body);
  if (!parsed.success) return invalid(parsed.error);
  const { name, place, lat, lng } = parsed.data;
  addEvent({
    itemId: p.item.id,
    type: "location",
    who: finderName(name),
    text: place && place.length ? place : null,
    lat: lat ?? null,
    lng: lng ?? null,
  });
  return Response.json({ ok: true });
}

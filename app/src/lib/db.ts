// SQLite data layer. Plain SQL on purpose: one file, no ORM, easy to port to
// Postgres later (every query is standard SQL; only `?` placeholders and the
// driver call change). Do not import this from client components.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR, UPLOAD_DIR } from "./config";
import {
  CODE_PREFIX,
  type Category,
  type Event,
  type EventType,
  type Item,
  type ItemWithCounts,
  type Owner,
  type Stat,
} from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS owner (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  handle TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  links TEXT NOT NULL DEFAULT '[]',
  reward_line TEXT NOT NULL DEFAULT 'Bring it back and the coffee is on me.'
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  finder_note TEXT NOT NULL DEFAULT '',
  public_stats TEXT NOT NULL DEFAULT '[]',
  lost INTEGER NOT NULL DEFAULT 0,
  lent_to TEXT,
  lent_due TEXT,
  photo TEXT,
  model3d TEXT,
  model3d_mtl TEXT,
  model3d_public INTEGER NOT NULL DEFAULT 1,
  serial TEXT,
  purchase_info TEXT,
  private_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  who TEXT NOT NULL,
  text TEXT,
  contact TEXT,
  lat REAL,
  lng REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_item_idx ON events(item_id, created_at);
CREATE INDEX IF NOT EXISTS events_created_idx ON events(created_at);
`;

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = path.join(DATA_DIR, "loot.sqlite");
  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  seedIfEmpty(d);
  _db = d;
  return d;
}

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomBytes(8).toString("hex");

// ---------- row mapping ----------

type ItemRow = {
  id: string; code: string; category: string; name: string; nickname: string;
  finder_note: string; public_stats: string; lost: number; lent_to: string | null;
  lent_due: string | null; photo: string | null; model3d: string | null;
  model3d_mtl: string | null; model3d_public: number; serial: string | null;
  purchase_info: string | null; private_notes: string | null; created_at: string;
  updated_at: string;
};

function rowToItem(r: ItemRow): Item {
  let publicStats: Stat[] = [];
  try { publicStats = JSON.parse(r.public_stats); } catch { publicStats = []; }
  return {
    id: r.id, code: r.code, category: r.category as Category, name: r.name,
    nickname: r.nickname, finderNote: r.finder_note, publicStats,
    lost: !!r.lost, lentTo: r.lent_to, lentDue: r.lent_due, photo: r.photo,
    model3d: r.model3d, model3dMtl: r.model3d_mtl, model3dPublic: !!r.model3d_public,
    serial: r.serial, purchaseInfo: r.purchase_info, privateNotes: r.private_notes,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

type EventRow = {
  id: string; item_id: string | null; type: string; who: string; text: string | null;
  contact: string | null; lat: number | null; lng: number | null; created_at: string;
};

function rowToEvent(r: EventRow): Event {
  return {
    id: r.id, itemId: r.item_id, type: r.type as EventType, who: r.who, text: r.text,
    contact: r.contact, lat: r.lat, lng: r.lng, createdAt: r.created_at,
  };
}

// ---------- owner ----------

export function getOwner(): Owner {
  const r = db().prepare("SELECT * FROM owner WHERE id = 1").get() as
    | { handle: string; name: string; bio: string; contact: string; links: string; reward_line: string }
    | undefined;
  if (!r) return { handle: "me", name: "Owner", bio: "", contact: "", links: [], rewardLine: "" };
  let links: Owner["links"] = [];
  try { links = JSON.parse(r.links); } catch { links = []; }
  return { handle: r.handle, name: r.name, bio: r.bio, contact: r.contact, links, rewardLine: r.reward_line };
}

export function updateOwner(o: Partial<Owner>): Owner {
  const cur = getOwner();
  const next = { ...cur, ...o };
  db().prepare(
    `INSERT INTO owner (id, handle, name, bio, contact, links, reward_line) VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, name=excluded.name, bio=excluded.bio,
       contact=excluded.contact, links=excluded.links, reward_line=excluded.reward_line`,
  ).run(next.handle, next.name, next.bio, next.contact, JSON.stringify(next.links), next.rewardLine);
  return next;
}

// ---------- items ----------

export function listItems(): ItemWithCounts[] {
  const rows = db().prepare(
    `SELECT i.*,
       (SELECT COUNT(*) FROM events e WHERE e.item_id = i.id AND e.type = 'scan') AS scans,
       (SELECT MAX(created_at) FROM events e WHERE e.item_id = i.id) AS last_event_at
     FROM items i ORDER BY i.created_at DESC`,
  ).all() as (ItemRow & { scans: number; last_event_at: string | null })[];
  return rows.map((r) => ({ ...rowToItem(r), scans: r.scans, lastEventAt: r.last_event_at }));
}

export function getItem(id: string): Item | null {
  const r = db().prepare("SELECT * FROM items WHERE id = ?").get(id) as ItemRow | undefined;
  return r ? rowToItem(r) : null;
}

export function getItemByCode(code: string): Item | null {
  const r = db().prepare("SELECT * FROM items WHERE lower(code) = lower(?)").get(code) as ItemRow | undefined;
  return r ? rowToItem(r) : null;
}

export function countScans(itemId: string): number {
  const r = db().prepare("SELECT COUNT(*) AS n FROM events WHERE item_id = ? AND type = 'scan'").get(itemId) as { n: number };
  return r.n;
}

/** Next free code for a category, e.g. RD-003. */
export function nextCode(category: Category): string {
  const prefix = CODE_PREFIX[category];
  const rows = db().prepare("SELECT code FROM items WHERE code LIKE ?").all(`${prefix}-%`) as { code: string }[];
  let max = 0;
  for (const { code } of rows) {
    const n = parseInt(code.slice(prefix.length + 1), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export type NewItem = {
  category: Category; name: string; nickname: string; finderNote?: string;
  publicStats?: Stat[]; serial?: string | null; purchaseInfo?: string | null; privateNotes?: string | null;
};

export function createItem(input: NewItem): Item {
  const id = newId();
  const t = now();
  const code = nextCode(input.category);
  db().prepare(
    `INSERT INTO items (id, code, category, name, nickname, finder_note, public_stats, serial, purchase_info, private_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, code, input.category, input.name, input.nickname, input.finderNote ?? "",
    JSON.stringify((input.publicStats ?? []).slice(0, 2)), input.serial ?? null,
    input.purchaseInfo ?? null, input.privateNotes ?? null, t, t,
  );
  addEvent({ itemId: id, type: "created", who: "You", text: `Tagged ${input.nickname} as ${code}` });
  return getItem(id)!;
}

export type ItemPatch = Partial<Pick<Item,
  "category" | "name" | "nickname" | "finderNote" | "publicStats" | "lost" | "lentTo" | "lentDue" |
  "photo" | "model3d" | "model3dMtl" | "model3dPublic" | "serial" | "purchaseInfo" | "privateNotes">>;

const COLS: Record<keyof ItemPatch, string> = {
  category: "category", name: "name", nickname: "nickname", finderNote: "finder_note",
  publicStats: "public_stats", lost: "lost", lentTo: "lent_to", lentDue: "lent_due", photo: "photo",
  model3d: "model3d", model3dMtl: "model3d_mtl", model3dPublic: "model3d_public", serial: "serial",
  purchaseInfo: "purchase_info", privateNotes: "private_notes",
};

export function updateItem(id: string, patch: ItemPatch): Item | null {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(patch) as [keyof ItemPatch, unknown][]) {
    if (v === undefined) continue;
    sets.push(`${COLS[k]} = ?`);
    if (k === "publicStats") vals.push(JSON.stringify((v as Stat[]).slice(0, 2)));
    else if (typeof v === "boolean") vals.push(v ? 1 : 0);
    else vals.push(v);
  }
  if (!sets.length) return getItem(id);
  sets.push("updated_at = ?");
  vals.push(now(), id);
  db().prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getItem(id);
}

export function deleteItem(id: string): void {
  const it = getItem(id);
  if (!it) return;
  db().prepare("DELETE FROM items WHERE id = ?").run(id);
  for (const f of [it.photo, it.model3d, it.model3dMtl]) {
    if (f) fs.rm(path.join(UPLOAD_DIR, f), { force: true }, () => {});
  }
}

// ---------- events ----------

export type NewEvent = {
  itemId: string | null; type: EventType; who: string; text?: string | null;
  contact?: string | null; lat?: number | null; lng?: number | null;
};

export function addEvent(e: NewEvent): Event {
  const id = newId();
  const t = now();
  db().prepare(
    `INSERT INTO events (id, item_id, type, who, text, contact, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, e.itemId, e.type, e.who, e.text ?? null, e.contact ?? null, e.lat ?? null, e.lng ?? null, t);
  return rowToEvent(db().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow);
}

export function listEvents(opts: { itemId?: string; limit?: number } = {}): Event[] {
  const limit = Math.min(opts.limit ?? 200, 1000);
  const rows = opts.itemId
    ? (db().prepare("SELECT * FROM events WHERE item_id = ? ORDER BY created_at DESC LIMIT ?").all(opts.itemId, limit) as EventRow[])
    : (db().prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT ?").all(limit) as EventRow[]);
  return rows.map(rowToEvent);
}

/** Events with coordinates, for the map. */
export function listPins(): (Event & { itemNickname: string; itemCode: string; itemLost: boolean })[] {
  const rows = db().prepare(
    `SELECT e.*, i.nickname AS item_nickname, i.code AS item_code, i.lost AS item_lost
     FROM events e JOIN items i ON i.id = e.item_id
     WHERE e.lat IS NOT NULL AND e.lng IS NOT NULL ORDER BY e.created_at DESC LIMIT 500`,
  ).all() as (EventRow & { item_nickname: string; item_code: string; item_lost: number })[];
  return rows.map((r) => ({ ...rowToEvent(r), itemNickname: r.item_nickname, itemCode: r.item_code, itemLost: !!r.item_lost }));
}

/** Simple per-IP rate limit for public finder endpoints. */
export function recentEventsFromContact(who: string, minutes: number): number {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const r = db().prepare("SELECT COUNT(*) AS n FROM events WHERE who = ? AND created_at > ?").get(who, since) as { n: number };
  return r.n;
}

// ---------- seed ----------

function seedIfEmpty(d: Database.Database) {
  const n = (d.prepare("SELECT COUNT(*) AS n FROM items").get() as { n: number }).n;
  const hasOwner = (d.prepare("SELECT COUNT(*) AS n FROM owner").get() as { n: number }).n;
  if (!hasOwner) {
    d.prepare(
      `INSERT INTO owner (id, handle, name, bio, contact, links, reward_line) VALUES (1, ?, ?, ?, ?, ?, ?)`,
    ).run(
      process.env.OWNER_HANDLE || "me",
      process.env.OWNER_NAME || "Kai Moreno",
      "Rides far, tags everything. If you found something of mine, thank you.",
      process.env.OWNER_CONTACT || "Set your contact in Settings",
      "[]",
      "Bring it back and the coffee is on me.",
    );
  }
  if (n > 0 || process.env.SEED_DEMO === "0") return;
  const t = now();
  const ins = d.prepare(
    `INSERT INTO items (id, code, category, name, nickname, finder_note, public_stats, lost, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const demo: [string, Category, string, string, string, Stat[], number][] = [
    ["RD-001", "Rides", "Canyon Endurace CF 7", "Comet", "Road bike. If you found it, please message me. There is a reward.", [{ label: "Colour", value: "Lime" }, { label: "Size", value: "56 cm" }], 0],
    ["TK-001", "Tech", "iPhone 15 Pro", "Pocket", "The phone is locked. Please message me and I will come and get it.", [{ label: "Colour", value: "Titanium" }], 0],
    ["TK-002", "Tech", "MacBook Pro 14\"", "Moonbeam", "Laptop with my work on it. Reward for its return.", [{ label: "Sticker", value: "Lime square" }], 0],
    ["RD-002", "Rides", "Subaru Outback 2019", "Big Blue", "If this car is blocking you or has been towed, call me.", [{ label: "Colour", value: "Blue" }], 0],
  ];
  const ev = d.prepare(
    `INSERT INTO events (id, item_id, type, who, text, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const [code, cat, name, nick, note, stats, lost] of demo) {
    const id = newId();
    ins.run(id, code, cat, name, nick, note, JSON.stringify(stats), lost, t, t);
    ev.run(newId(), id, "created", "You", `Tagged ${nick} as ${code}`, null, null, t);
    if (code === "RD-001") {
      ev.run(newId(), id, "scan", "Finder", null, 52.473, 13.401, t);
      ev.run(newId(), id, "location", "Finder", "Tempelhofer Feld, near the north entrance", 52.4765, 13.4025, t);
    }
  }
}

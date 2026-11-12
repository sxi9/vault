// Shared data types. The DB layer (src/lib/db.ts) returns exactly these.

export const CATEGORIES = ["Tech", "Rides", "Gear", "Pets", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Category → code prefix for item codes like BK-002. */
export const CODE_PREFIX: Record<Category, string> = {
  Tech: "TK",
  Rides: "RD",
  Gear: "GR",
  Pets: "PT",
  Other: "IT",
};

export type Stat = { label: string; value: string };

export type Item = {
  id: string;
  /** Short public code, e.g. "RD-001". Unique. Encoded in the QR. */
  code: string;
  category: Category;
  /** What it is, e.g. "Canyon Endurace CF 7". */
  name: string;
  /** Friendly name shown big on the tag page, e.g. "Comet". */
  nickname: string;
  /** Message shown to a finder. */
  finderNote: string;
  /** Up to 2 stats the owner chooses to show finders. */
  publicStats: Stat[];
  lost: boolean;
  /** Who has it on loan, or null. */
  lentTo: string | null;
  lentDue: string | null;
  /** Stored file names inside DATA_DIR/uploads, or null. */
  photo: string | null;
  /** 3D model file name inside DATA_DIR/uploads (glb, gltf, usdz, obj), or null. */
  model3d: string | null;
  /** Companion .mtl for an .obj model, or null. */
  model3dMtl: string | null;
  /** Whether the 3D model is shown on the public tag page. */
  model3dPublic: boolean;
  /** Private fields: never rendered on public pages. */
  serial: string | null;
  purchaseInfo: string | null;
  privateNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventType =
  | "scan"
  | "message"
  | "location"
  | "lost"
  | "found"
  | "lend"
  | "return"
  | "created"
  | "note";

export type Event = {
  id: string;
  itemId: string | null;
  type: EventType;
  /** Who did it: "Finder", "You", or a name the finder typed. */
  who: string;
  /** Free text: message body, place name, note. */
  text: string | null;
  /** Finder contact (email or phone) when they left one. Owner-only. */
  contact: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
};

export type Owner = {
  handle: string;
  name: string;
  bio: string;
  /** Shown to finders as the way to reach you, e.g. a phone, email, or Signal handle. */
  contact: string;
  /** Optional links shown on the tag page. */
  links: { label: string; url: string }[];
  /** Standing offer line on the tag page. */
  rewardLine: string;
};

export type ItemWithCounts = Item & { scans: number; lastEventAt: string | null };

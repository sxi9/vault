"use client";

// Owner-side form for the 3D scan: upload (with progress), public toggle, delete.
// Talks to /api/items/[id]/model and refreshes the server-rendered page after.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  itemId: string;
  hasModel: boolean;
  ext: string | null;
  isPublic: boolean;
  /** Passed from the server so this client bundle never imports lib/config (node:path). */
  maxBytes: number;
  extensions: readonly string[];
};

type Phase = "idle" | "uploading" | "saving";

const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();
const mb = (n: number) => `${(n / 1048576).toFixed(n >= 10 * 1048576 ? 0 : 1)} MB`;

export function ModelUploader({ itemId, hasModel, ext, isPublic, maxBytes, extensions }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [model, setModel] = useState<File | null>(null);
  const [mtl, setMtl] = useState<File | null>(null);
  const [pub, setPub] = useState(isPublic);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endpoint = `/api/items/${itemId}/model`;
  const modelExt = model ? extOf(model.name) : null;
  const isObj = modelExt === "obj";
  const busy = phase !== "idle";

  function validate(): string | null {
    if (!model) return "Pick a model file first.";
    if (!modelExt || !extensions.includes(modelExt)) {
      return `.${modelExt || "?"} is not supported. Export GLB, USDZ, OBJ or glTF.`;
    }
    if (model.size > maxBytes) return `That file is ${mb(model.size)}; the limit is ${mb(maxBytes)}.`;
    if (mtl && !isObj) return "A .mtl file only goes with an .obj model.";
    if (mtl && extOf(mtl.name) !== "mtl") return "The materials file must be a .mtl.";
    return null;
  }

  function upload(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem || !model) {
      setError(problem);
      return;
    }
    setError(null);
    setNotice(null);
    setPhase("uploading");
    setProgress(0);

    const fd = new FormData();
    fd.append("model", model);
    if (mtl && isObj) fd.append("mtl", mtl);
    fd.append("public", pub ? "1" : "0");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onerror = () => {
      setPhase("idle");
      setError("Upload failed. Check your connection and try again.");
    };
    xhr.onload = () => {
      setPhase("idle");
      let body: { ok?: boolean; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-json error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) {
        setModel(null);
        setMtl(null);
        formRef.current?.reset();
        setNotice("Model saved.");
        router.refresh();
      } else {
        setError(body.error || (xhr.status === 413 ? "File too large for the server." : `Upload failed (${xhr.status}).`));
      }
    };
    xhr.send(fd);
  }

  async function setPublic(next: boolean) {
    setPub(next);
    if (!hasModel) return; // only a preference for the coming upload
    setPhase("saving");
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public: next }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error || `Could not save (${res.status})`);
      setNotice(next ? "Finders can see the model." : "Model is private.");
      router.refresh();
    } catch (err) {
      setPub(!next);
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setPhase("idle");
    }
  }

  async function remove() {
    if (!window.confirm("Remove the 3D model? The file is deleted from the server.")) return;
    setPhase("saving");
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error || `Could not delete (${res.status})`);
      setNotice("Model removed.");
      setPub(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setPhase("idle");
    }
  }

  const fileInput =
    "block w-full text-sm text-ink3 max-w-full file:mr-3 file:h-9 file:px-3 file:rounded-full file:border file:border-line3 file:bg-transparent file:text-ink file:text-[13px] file:font-semibold file:cursor-pointer";

  return (
    <form ref={formRef} onSubmit={upload} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="label">{hasModel ? "Replace model" : "Model file"}</span>
          <input
            type="file"
            name="model"
            accept=".glb,.gltf,.usdz,.obj"
            disabled={busy}
            className={fileInput}
            onChange={(e) => {
              setModel(e.target.files?.[0] ?? null);
              setError(null);
              setNotice(null);
            }}
          />
        </label>

        {isObj && (
          <label className="flex flex-col gap-2">
            <span className="label">Materials (.mtl) · optional</span>
            <input
              type="file"
              name="mtl"
              accept=".mtl"
              disabled={busy}
              className={fileInput}
              onChange={(e) => setMtl(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        {modelExt === "gltf" && (
          <p className="tile text-[13px] leading-snug text-ink2">
            A .gltf that points at separate .bin or texture files will not load here. Export a single-file GLB instead.
          </p>
        )}
        {modelExt === "usdz" && (
          <p className="tile text-[13px] leading-snug text-ink2">
            USDZ shows as an AR Quick Look tile on iPhone (no in-page 3D). Export GLB too if you want the spinning viewer.
          </p>
        )}
      </div>

      <p className="text-[13px] leading-snug text-ink3">
        Scan with Polycam, Scaniverse or RealityScan on iPhone and export GLB (best) or USDZ. OBJ needs its .mtl. Up to{" "}
        {mb(maxBytes)}.
      </p>

      {phase === "uploading" && (
        <div className="flex flex-col gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-lime transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
          <span className="label">
            Uploading · {progress}%{model ? ` · ${mb(model.size)}` : ""}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="font-mono text-[12px] leading-snug text-danger">
          {error}
        </p>
      )}
      {notice && !error && <p className="label text-limeInk">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary h-10" disabled={busy || !model}>
          {phase === "uploading" ? "Uploading…" : hasModel ? "Replace model" : "Upload model"}
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={pub}
          disabled={busy}
          onClick={() => void setPublic(!pub)}
          className="inline-flex cursor-pointer items-center gap-3 rounded-full select-none disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          <span
            aria-hidden
            className="relative block h-7 w-12 rounded-full transition-colors duration-200"
            style={{ background: pub ? "var(--lime)" : "var(--track)" }}
          >
            <span
              className="absolute top-[3px] h-[22px] w-[22px] rounded-full transition-[left] duration-200"
              style={{ left: pub ? 23 : 3, background: pub ? "var(--on-lime)" : "var(--ink)" }}
            />
          </span>
          <span className="label">{pub ? "Shown on tag page" : "Private"}</span>
        </button>

        {hasModel && (
          <button type="button" className="btn btn-danger h-10 sm:ml-auto" disabled={busy} onClick={() => void remove()}>
            Remove{ext ? ` .${ext}` : ""}
          </button>
        )}
      </div>
    </form>
  );
}

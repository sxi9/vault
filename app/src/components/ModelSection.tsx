// 3D model section, shared by the owner item page (editable) and the public
// tag page (viewer only). Server component; the viewer and uploader are clients.
import type { Item } from "@/lib/types";
import { extensionOf, uploadUrl } from "@/lib/uploads";
import { MAX_MODEL_BYTES, MODEL_EXTENSIONS } from "@/lib/config";
import { ModelViewer, type ModelExt } from "./ModelViewer";
import { ModelUploader } from "./ModelUploader";

const EXTS: readonly ModelExt[] = ["glb", "gltf", "obj", "usdz"];

function modelOf(item: Item): { src: string; ext: ModelExt; mtlSrc: string | null; poster: string | null } | null {
  if (!item.model3d) return null;
  const ext = extensionOf(item.model3d);
  if (!EXTS.includes(ext as ModelExt)) return null;
  return {
    src: uploadUrl(item.model3d),
    ext: ext as ModelExt,
    mtlSrc: item.model3dMtl ? uploadUrl(item.model3dMtl) : null,
    poster: item.photo ? uploadUrl(item.photo) : null,
  };
}

export function ModelSection({ item, editable }: { item: Item; editable: boolean }) {
  const model = modelOf(item);

  if (!editable) {
    if (!model || !item.model3dPublic) return null;
    return (
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-paper-muted">
          3D model · {model.ext === "usdz" ? "tap to view in AR" : "drag to rotate"}
        </p>
        <ModelViewer src={model.src} ext={model.ext} mtlSrc={model.mtlSrc} poster={model.poster} height={300} />
      </div>
    );
  }

  return (
    <section id="model" className="card flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="label">3D model</p>
        <span
          className="pill"
          style={
            model && item.model3dPublic
              ? { borderColor: "var(--lime)", color: "var(--limeInk)" }
              : { color: "var(--ink4)" }
          }
        >
          {model ? (item.model3dPublic ? "Public on tag" : "Owner only") : "No scan yet"}
        </span>
      </div>

      {model ? (
        <div className="flex flex-col gap-2">
          <ModelViewer src={model.src} ext={model.ext} mtlSrc={model.mtlSrc} poster={model.poster} height={320} />
          <p className="label">
            {model.ext.toUpperCase()}
            {model.mtlSrc ? " + MTL" : ""} · {model.ext === "usdz" ? "AR Quick Look on iPhone" : "drag to rotate"}
          </p>
        </div>
      ) : (
        <div className="tile flex flex-col gap-1 border border-dashed border-line3 bg-transparent py-5 text-center">
          <span className="font-display text-[22px] font-bold tracking-[-0.03em] text-ink">No 3D scan yet</span>
          <span className="text-[13px] text-ink3">Upload your iPhone scan and finders can spin it on the tag page.</span>
        </div>
      )}

      <ModelUploader
        itemId={item.id}
        hasModel={!!model}
        ext={model?.ext ?? null}
        isPublic={item.model3dPublic}
        maxBytes={MAX_MODEL_BYTES}
        extensions={MODEL_EXTENSIONS}
      />
    </section>
  );
}

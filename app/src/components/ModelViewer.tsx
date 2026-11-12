"use client";

// 3D viewer for the owner's own iPhone scans (GLB / glTF / OBJ). USDZ cannot be
// rendered reliably by three.js, so it gets an AR Quick Look tile instead.
// The WebGL context is only created after the viewer is tapped ("Load 3D model"),
// so the public tag page stays light. three is imported lazily for the same reason.

import { useEffect, useRef, useState } from "react";

export type ModelExt = "glb" | "gltf" | "obj" | "usdz";

export type ModelViewerProps = {
  src: string;
  ext: ModelExt;
  mtlSrc?: string | null;
  poster?: string | null;
  height?: number;
};

type Status = "idle" | "loading" | "ready" | "error";

// The stage is always dark, whatever the page theme (it sits on paper on the tag page).
const STAGE = "#121216";
const STAGE_BG = "radial-gradient(120% 70% at 50% 100%, #26262e 0%, #121216 60%)";
const MONO = "font-mono text-[11px] uppercase tracking-[0.12em]";

// Safari needs an <img> as the first child of a rel="ar" anchor to launch Quick Look.
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function ModelViewer({ src, ext, mtlSrc, poster, height = 320 }: ModelViewerProps) {
  if (ext === "usdz") return <UsdzTile src={src} poster={poster} height={height} />;
  return <WebGLViewer src={src} ext={ext} mtlSrc={mtlSrc} poster={poster} height={height} />;
}

function Stage({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px] select-none"
      // No touch-action here: OrbitControls sets it on the canvas once the model is
      // ready, so the idle tile and the USDZ tile still let the page scroll.
      style={{ height, background: STAGE_BG, backgroundColor: STAGE }}
    >
      {children}
    </div>
  );
}

function Poster({ poster }: { poster?: string | null }) {
  if (!poster) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={poster}
      alt=""
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover opacity-30 blur-[2px] scale-105"
    />
  );
}

function UsdzTile({ src, poster, height }: { src: string; poster?: string | null; height: number }) {
  return (
    <Stage height={height}>
      <Poster poster={poster} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center">
        <div className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-[#f1f0ea]">
          USDZ
        </div>
        <p className={`${MONO} text-[#9b9aa5]`}>Apple scan · opens in AR on iPhone</p>
        <a
          rel="ar"
          href={src}
          className="btn btn-primary no-underline hover:no-underline"
          style={{ color: "#0e0e11" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BLANK_PNG} alt="" width={1} height={1} style={{ width: 1, height: 1, opacity: 0 }} />
          View in AR (iPhone)
        </a>
        <a href={src} download className={`${MONO} text-[#9b9aa5] underline-offset-4 hover:text-[#f1f0ea]`}>
          Download .usdz
        </a>
      </div>
    </Stage>
  );
}

function WebGLViewer({
  src,
  ext,
  mtlSrc,
  poster,
  height,
}: {
  src: string;
  ext: "glb" | "gltf" | "obj";
  mtlSrc?: string | null;
  poster?: string | null;
  height: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [webgl, setWebgl] = useState(true);
  // Bumped on every "Load" / "Try again" tap; the effect (re)builds the scene per attempt.
  const [attempt, setAttempt] = useState(0);

  const start = () => {
    setError(null);
    setProgress(null);
    setStatus("loading");
    setAttempt((a) => a + 1);
  };

  useEffect(() => {
    if (attempt === 0) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      const reduceMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const [THREE, { OrbitControls }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
      ]);
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        setWebgl(false);
        setStatus("error");
        setError("WebGL is not available in this browser");
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, host.clientWidth / Math.max(1, host.clientHeight), 0.01, 1000);
      camera.position.set(0, 0.6, 3);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a44, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(3, 5, 2);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xdfffa0, 0.6);
      fill.position.set(-4, 1, -3);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.autoRotate = !reduceMotion;
      controls.autoRotateSpeed = 1.6;
      setSpinning(controls.autoRotate);
      const stopSpin = () => {
        controls.autoRotate = false;
        setSpinning(false);
      };
      controls.addEventListener("start", stopSpin);

      const onProgress = (e: ProgressEvent) => {
        if (e.lengthComputable && e.total > 0) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      let object: import("three").Object3D;
      try {
        if (ext === "obj") {
          const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
          const objLoader = new OBJLoader();
          if (mtlSrc) {
            const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
            const base = mtlSrc.slice(0, mtlSrc.lastIndexOf("/") + 1);
            const materials = await new MTLLoader().setResourcePath(base).loadAsync(mtlSrc);
            materials.preload();
            objLoader.setMaterials(materials);
          }
          object = await objLoader.loadAsync(src, onProgress);
        } else {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().loadAsync(src, onProgress);
          object = gltf.scene;
        }
      } catch (err) {
        if (disposed) return;
        console.error("[ModelViewer]", err);
        setStatus("error");
        setError(
          ext === "gltf"
            ? "Could not load this glTF. It probably references external .bin or texture files — export a single-file GLB instead."
            : "Could not load this model.",
        );
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        return;
      }
      if (disposed) {
        disposeObject(object);
        return;
      }

      // Auto-frame: centre the object and back the camera off its bounding sphere.
      const box = new THREE.Box3().setFromObject(object);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const radius = sphere.radius > 0 && Number.isFinite(sphere.radius) ? sphere.radius : 1;
      object.position.sub(sphere.center);
      scene.add(object);
      const fov = (camera.fov * Math.PI) / 180;
      const dist = (radius / Math.sin(fov / 2)) * 1.15;
      camera.position.set(dist * 0.35, dist * 0.3, dist);
      camera.near = Math.max(0.001, dist / 100);
      camera.far = dist * 100;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.minDistance = radius * 0.4;
      controls.maxDistance = dist * 4;
      controls.update();

      const onResize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(host);
      onResize();

      const tick = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      setStatus("ready");
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.removeEventListener("start", stopSpin);
        controls.dispose();
        disposeObject(object);
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    })().catch((err) => {
      if (disposed) return;
      console.error("[ModelViewer]", err);
      setStatus("error");
      setError("Could not start the 3D viewer.");
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [attempt, src, ext, mtlSrc]);

  const fmt = ext.toUpperCase();

  return (
    <Stage height={height}>
      {status !== "ready" && <Poster poster={poster} />}
      {/* WebGL host: present once loading started so the canvas has a size to measure */}
      <div ref={hostRef} className="absolute inset-0" />

      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-[#f1f0ea]">
            {fmt}
          </div>
          <p className={`${MONO} text-[#9b9aa5]`}>3D scan · loads on tap</p>
          <button type="button" className="btn btn-primary" onClick={start}>
            Load 3D model
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#2e2e36]">
            <div
              className="h-full rounded-full bg-lime transition-[width] duration-300"
              style={{ width: `${progress ?? 15}%` }}
            />
          </div>
          <p className={`${MONO} text-[#9b9aa5]`}>
            Loading {fmt}
            {progress !== null ? ` · ${progress}%` : ""}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <p className={`${MONO} text-[#ff6b61]`}>Could not show the model</p>
          <p className="max-w-[300px] text-[13px] leading-snug text-[#b9b8c2]">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {webgl && (
              <button type="button" className="btn text-[#f1f0ea]" onClick={start}>
                Try again
              </button>
            )}
            <a href={src} download className="btn text-[#f1f0ea] hover:no-underline">
              Download .{ext}
            </a>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-3">
          <span className={`${MONO} text-[#9b9aa5]`}>{spinning ? "Auto-spin · drag to rotate" : "Drag to rotate · pinch to zoom"}</span>
          <span className={`${MONO} text-[#9b9aa5]`}>{fmt}</span>
        </div>
      )}
    </Stage>
  );
}

function disposeObject(root: import("three").Object3D) {
  root.traverse((node) => {
    const mesh = node as import("three").Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const rec = m as unknown as Record<string, unknown>;
      for (const key of Object.keys(rec)) {
        const v = rec[key];
        if (v && typeof v === "object" && (v as { isTexture?: boolean }).isTexture) {
          (v as import("three").Texture).dispose();
        }
      }
      m.dispose();
    }
  });
}

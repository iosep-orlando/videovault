"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { formatBytes } from "@/lib/format";
import { putWithProgress } from "@/lib/upload";
import { MAX_VIDEO_BYTES } from "@/lib/validation";
import FormError from "./FormError";
import MetadataFields, { toPayload, type MetadataValue } from "./MetadataFields";
import { button, buttonSecondary, card } from "./ui";

type Phase = "idle" | "uploading" | "saving";

const EMPTY_META: MetadataValue = { name: "", description: "", tags: [], meta: [] };

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<MetadataValue>(EMPTY_META);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Previsualización del fichero elegido, antes de subirlo: una URL local que
  // apunta al fichero en el disco, sin enviarlo a ningún sitio. Se libera al
  // cambiar de fichero o al salir, para no retener el vídeo en memoria.
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const localUrlRef = useRef<string | null>(null);
  function showPreview(next: File | null) {
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    localUrlRef.current = next ? URL.createObjectURL(next) : null;
    setLocalUrl(localUrlRef.current);
  }

  // Next.js 16 no destruye la página al salir de ella: la oculta (<Activity>)
  // y al volver la muestra tal como estaba. Para una subida nueva eso confunde:
  // aparecían los datos del vídeo anterior. Esta limpieza se ejecuta cuando la
  // página se oculta, así que cada visita a "Subir vídeo" empieza en blanco.
  useLayoutEffect(() => {
    const form = formRef.current;
    return () => {
      abort.current?.abort(); // si se sale a mitad de subida, se cancela
      form?.reset(); // el <input type="file"> no se controla con estado
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
      setLocalUrl(null);
      setFile(null);
      setMeta(EMPTY_META);
      setPhase("idle");
      setProgress(0);
      setError(null);
    };
  }, []);

  function pickFile(next: File | null) {
    setError(null);
    if (next && next.size > MAX_VIDEO_BYTES) {
      setError(`Ese vídeo ocupa ${formatBytes(next.size)}; el máximo es 500 MB.`);
      return;
    }
    setFile(next);
    showPreview(next);
    // El nombre del fichero, sin extensión, como nombre por defecto.
    if (next && !meta.name) setMeta({ ...meta, name: next.name.replace(/\.[^.]+$/, "") });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return setError("Elegí un vídeo.");
    setError(null);
    setProgress(0);
    const contentType = file.type || "video/mp4";

    try {
      // 1 · Metadatos y URL firmada.
      setPhase("uploading");
      const created = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...toPayload(meta), contentType, size: file.size }),
      });
      const data = await created.json().catch(() => ({}));
      if (!created.ok) throw new Error(data.error ?? "No se pudo preparar la subida.");

      // 2 · El vídeo, directo del navegador a RustFS.
      abort.current = new AbortController();
      await putWithProgress(data.uploadUrl, file, contentType, setProgress, abort.current.signal);

      // 3 · Avisar al servidor, que comprueba el fichero en RustFS.
      setPhase("saving");
      const done = await fetch(`/api/videos/${data.id}/complete`, { method: "POST" });
      const doneData = await done.json().catch(() => ({}));
      if (!done.ok) throw new Error(doneData.error ?? "No se pudo completar la subida.");

      router.push(`/videos/${data.id}`);
    } catch (err) {
      setPhase("idle");
      if (err instanceof DOMException && err.name === "AbortError") return setError("Subida cancelada.");
      setError(err instanceof Error ? err.message : "Algo falló al subir el vídeo.");
    }
  }

  const busy = phase !== "idle";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`${card} space-y-6`}>
      <div>
        <label htmlFor="video-file" className="mb-2 block text-sm font-medium text-slate-700">Vídeo (máximo 500 MB)</label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          disabled={busy}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-medium file:text-violet-800 hover:file:bg-violet-200"
        />
        {file && <p className="mt-2 text-sm text-muted">{file.name}, {formatBytes(file.size)}</p>}
        {localUrl && (
          <div className="mt-3 max-w-md rounded-xl bg-mount p-2">
            <video src={localUrl} controls muted playsInline className="aspect-video w-full rounded-md bg-black" />
          </div>
        )}
      </div>

      <MetadataFields value={meta} onChange={setMeta} />

      {busy && (
        <div aria-live="polite">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{phase === "saving" ? "Guardando…" : "Subiendo…"}</span>
            <span className="tabular">{Math.round(progress * 100)} %</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full bg-violet-600 transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <FormError message={error} />

      <div className="flex gap-3">
        <button type="submit" disabled={busy || !file} className={button}>
          {busy ? "Subiendo…" : "Subir vídeo"}
        </button>
        {phase === "uploading" && (
          <button type="button" onClick={() => abort.current?.abort()} className={buttonSecondary}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

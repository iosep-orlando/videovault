"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatBytes, formatDate } from "@/lib/format";
import type { VideoDTO } from "@/lib/types";
import FormError from "./FormError";
import MetadataFields, { toPayload, type MetadataValue } from "./MetadataFields";
import { button, buttonDanger, buttonSecondary, card } from "./ui";

const toForm = (v: VideoDTO): MetadataValue => ({
  name: v.name,
  description: v.description,
  tags: v.tags,
  meta: v.meta,
});

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDTO | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState<MetadataValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const player = useRef<HTMLVideoElement>(null);

  // Al salir de la ficha, Next.js 16 no la destruye: la oculta. El <video>
  // seguiría sonando de fondo en otra página, y la edición a medias seguiría
  // abierta al volver. Esta limpieza se ejecuta justo al ocultarla.
  useLayoutEffect(() => {
    return () => {
      setEditing(null);
      setError(null);
    };
  }, []);

  // El <video> aparece cuando llega su URL; se captura entonces y se pausa al
  // ocultar la página (o si la URL cambia).
  useLayoutEffect(() => {
    const video = player.current;
    return () => video?.pause();
  }, [playUrl]);

  // Se vuelve a ejecutar cada vez que la ficha se muestra: datos al día.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/videos/${id}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setNotFound(true);
        const data = await res.json();
        setVideo(data.video);
        // URL firmada de lectura: el <video> la usa como src, y caduca en 1 h.
        setPlayUrl(data.playUrl);
      })
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(editing)),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "No se pudo guardar.");
    setVideo(data.video);
    setEditing(null);
  }

  async function remove() {
    if (!window.confirm("¿Borrar este vídeo? Se elimina el archivo y sus datos. No se puede deshacer.")) return;
    setBusy(true);
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError("No se pudo borrar el vídeo.");
    router.push("/videos");
  }

  if (notFound) {
    return (
      <div className={card}>
        <p>Este vídeo no existe o no es tuyo.</p>
        <Link href="/videos" className="mt-4 inline-block font-medium text-violet-700 hover:underline">Volver a mis vídeos</Link>
      </div>
    );
  }
  if (!video) return <p className="text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-6">
      <Link href="/videos" className="text-sm text-slate-500 hover:text-slate-800">← Mis vídeos</Link>

      {playUrl && (
        // Reproductor HTML5 nativo; el navegador pide los trozos que necesita
        // directamente a RustFS con la URL firmada.
        <div className="rounded-2xl bg-mount p-2 sm:p-3">
          <video ref={player} key={playUrl} controls preload="metadata" src={playUrl} className="aspect-video w-full rounded-lg bg-black" />
        </div>
      )}

      {editing ? (
        <div className={`${card} space-y-4`}>
          <MetadataFields value={editing} onChange={setEditing} />
          <FormError message={error} />
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={busy} className={button}>{busy ? "Guardando…" : "Guardar"}</button>
            <button type="button" onClick={() => { setEditing(null); setError(null); }} className={buttonSecondary}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className={`${card} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{video.name}</h1>
              <p className="tabular mt-1 text-sm text-muted">{formatDate(video.createdAt)}, {formatBytes(video.sizeBytes)}, {video.contentType}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(toForm(video))} className={buttonSecondary}>Editar</button>
              <button type="button" onClick={remove} disabled={busy} className={buttonDanger}>Borrar</button>
            </div>
          </div>
          {video.description && <p className="whitespace-pre-line text-slate-700">{video.description}</p>}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.tags.map((t) => <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800">#{t}</span>)}
            </div>
          )}
          {video.meta.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {video.meta.map((p) => (
                <div key={p.key} className="contents">
                  <dt className="font-medium text-slate-500">{p.key}</dt>
                  <dd>{p.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <FormError message={error} />
        </div>
      )}
    </div>
  );
}

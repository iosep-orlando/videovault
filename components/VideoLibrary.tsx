"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatBytes } from "@/lib/format";
import type { Stats, VideoDTO } from "@/lib/types";
import FormError from "./FormError";
import VideoCard from "./VideoCard";
import { button, input, pageTitle } from "./ui";

const EMPTY = { q: "", tag: "", key: "", value: "" };
type Filters = typeof EMPTY;

export default function VideoLibrary() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  // Los filtros de la última búsqueda: en un ref para recargar con ellos al
  // volver a la página, y en estado para pintar "Quitar filtros".
  const lastFilters = useRef<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);

  const load = useCallback(async (f: Filters) => {
    lastFilters.current = f;
    setApplied(f);
    setError(null);
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v.trim()));
    try {
      const [s, v] = await Promise.all([fetch("/api/stats"), fetch(`/api/videos?${params}`)]);
      if (!s.ok || !v.ok) throw new Error();
      setStats(await s.json());
      setVideos((await v.json()).videos);
    } catch {
      setError("No se pudieron cargar los vídeos. Revisá que MongoDB y RustFS estén en marcha.");
      setVideos([]);
    }
  }, []);

  // Next.js 16 conserva esta página oculta al ir a otra, y vuelve a ejecutar
  // este efecto cada vez que se muestra. Así, al volver de subir, editar o
  // borrar un vídeo, la lista y el panel se recargan, con la búsqueda que
  // hubiera (que sí conviene conservar).
  useEffect(() => {
    void load(lastFilters.current);
  }, [load]);

  function apply(next: Filters) {
    setFilters(next);
    void load(next);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    void load(filters);
  }

  const toggleTag = (tag: string) => apply({ ...filters, tag: filters.tag === tag ? "" : tag });
  const filtering = Object.values(applied).some((v) => v.trim());

  return (
    <div>
      {/* Título y panel de uso, en una línea */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className={pageTitle}>Mis vídeos</h1>
        <p className="tabular text-muted">
          {stats
            ? `${stats.count} ${stats.count === 1 ? "vídeo" : "vídeos"}, ${formatBytes(stats.totalBytes)} ocupados`
            : " "}
        </p>
      </div>

      {/* Búsqueda */}
      <form onSubmit={search} className="mt-6">
        <div className="flex gap-2">
          <input
            type="search"
            aria-label="Buscar en nombre o descripción"
            placeholder="Buscar en nombre o descripción"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            className={`${input} h-12 text-lg`}
          />
          <button type="submit" className={`${button} h-12 px-6`}>Buscar</button>
        </div>

        {stats && stats.topTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Tus tags">
            {stats.topTags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={filters.tag === tag}
                className={`rounded-full px-3 py-1 text-sm ${
                  filters.tag === tag ? "bg-accent text-white" : "bg-white text-mount ring-1 ring-slate-300 hover:ring-violet-400"
                }`}
              >
                #{tag} <span className="tabular opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}

        <details className="mt-3 text-sm" open={Boolean(filters.key)}>
          <summary className="cursor-pointer text-muted hover:text-mount">Búsqueda avanzada: por tus datos propios</summary>
          <div className="mt-2 grid gap-2 sm:max-w-xl sm:grid-cols-2">
            <input aria-label="Clave" placeholder="clave, por ejemplo cliente" value={filters.key} onChange={(e) => setFilters({ ...filters, key: e.target.value })} className={input} />
            <input aria-label="Valor" placeholder="valor, por ejemplo acme" value={filters.value} onChange={(e) => setFilters({ ...filters, value: e.target.value })} className={input} />
          </div>
        </details>
      </form>

      {filtering && (
        <button type="button" onClick={() => apply(EMPTY)} className="mt-4 text-sm font-medium text-accent hover:underline">
          Quitar filtros y ver todos
        </button>
      )}

      <div className="mt-4"><FormError message={error} /></div>

      {/* La mesa de luz */}
      {videos === null ? (
        <p className="mt-8 text-muted">Cargando…</p>
      ) : videos.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
          <p className="text-muted">{filtering ? "Ningún vídeo coincide con la búsqueda." : "Tu mesa de luz está vacía."}</p>
          {!filtering && (
            <Link href="/videos/subir" className={`${button} mt-4 inline-block`}>
              Subir tu primer vídeo
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} activeTag={filters.tag} onTag={toggleTag} />
          ))}
        </ul>
      )}
    </div>
  );
}

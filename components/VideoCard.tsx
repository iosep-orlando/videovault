"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatDuration } from "@/lib/duration";
import { formatBytes, formatDate } from "@/lib/format";
import type { VideoDTO } from "@/lib/types";

// Cada vídeo es una diapositiva sobre la mesa de luz: una montura oscura con
// el fotograma dentro. La miniatura es el propio vídeo: el navegador solo
// pide los primeros fotogramas (preload="metadata"), y #t=1 muestra el del
// segundo 1 en vez de un primer fotograma que suele ser negro.
export default function VideoCard({
  video,
  activeTag,
  onTag,
}: {
  video: VideoDTO;
  activeTag?: string;
  onTag: (tag: string) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<string>("");

  // Al pasar el mouse, se reproduce en silencio dentro del marco. Es una
  // respuesta a la acción de la persona, y se respeta "reducir movimiento".
  function preview(on: boolean) {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (on) void v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 1;
    }
  }

  return (
    <li className="flex flex-col">
      <Link
        href={`/videos/${video.id}`}
        onMouseEnter={() => preview(true)}
        onMouseLeave={() => preview(false)}
        onFocus={() => preview(true)}
        onBlur={() => preview(false)}
        className="group block rounded-xl bg-mount p-2 shadow-[0_1px_0_rgba(255,255,255,.08)_inset,0_6px_16px_-8px_rgba(28,35,51,.5)] transition-transform hover:-translate-y-0.5"
      >
        <div className="relative aspect-video overflow-hidden rounded-md bg-black">
          {video.previewUrl && (
            <video
              ref={ref}
              src={`${video.previewUrl}#t=1`}
              muted
              playsInline
              loop
              preload="metadata"
              onLoadedMetadata={(e) => setDuration(formatDuration(e.currentTarget.duration))}
              className="h-full w-full object-cover"
            />
          )}
          {duration && (
            <span className="tabular absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
              {duration}
            </span>
          )}
        </div>
        <p className="mt-2 truncate px-1 pb-0.5 font-medium text-white">{video.name}</p>
      </Link>

      <p className="tabular mt-2 px-1 text-sm text-muted">
        {formatDate(video.createdAt)}, {formatBytes(video.sizeBytes)}
      </p>
      {video.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 px-1">
          {video.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTag(t)}
              aria-pressed={t === activeTag}
              className={`rounded-full px-2 py-0.5 text-xs ${
                t === activeTag ? "bg-accent text-white" : "bg-violet-100 text-violet-900 hover:bg-violet-200"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

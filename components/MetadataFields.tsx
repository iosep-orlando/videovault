"use client";

import type { MetaPair } from "@/lib/types";
import TagInput from "./TagInput";
import { input, label } from "./ui";

export interface MetadataValue {
  name: string;
  description: string;
  tags: string[];
  meta: MetaPair[];
}

// Campos de metadatos, compartidos por la subida y la edición.
export default function MetadataFields({
  value,
  onChange,
}: {
  value: MetadataValue;
  onChange: (next: MetadataValue) => void;
}) {
  const set = (patch: Partial<MetadataValue>) => onChange({ ...value, ...patch });
  const setPair = (i: number, patch: Partial<MetaPair>) =>
    set({ meta: value.meta.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="video-name" className={label}>Nombre</label>
        <input id="video-name" required maxLength={120} value={value.name} onChange={(e) => set({ name: e.target.value })} className={input} />
      </div>
      <div>
        <label htmlFor="video-description" className={label}>Descripción</label>
        <textarea id="video-description" rows={3} maxLength={2000} value={value.description} onChange={(e) => set({ description: e.target.value })} className={input} />
      </div>
      <div>
        <label htmlFor="video-tags" className={label}>Tags</label>
        <TagInput id="video-tags" value={value.tags} onChange={(tags) => set({ tags })} />
        <p className="mt-1 text-xs text-slate-500">Coma, punto y coma o Enter para cerrar cada tag.</p>
      </div>
      <fieldset>
        <legend className={label}>Datos propios (clave → valor)</legend>
        <div className="space-y-2">
          {value.meta.map((pair, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`Clave ${i + 1}`} placeholder="cliente" value={pair.key} onChange={(e) => setPair(i, { key: e.target.value })} className={input} />
              <input aria-label={`Valor ${i + 1}`} placeholder="acme" value={pair.value} onChange={(e) => setPair(i, { value: e.target.value })} className={input} />
              <button type="button" aria-label={`Quitar par ${i + 1}`} onClick={() => set({ meta: value.meta.filter((_, j) => j !== i) })} className="rounded-lg px-3 text-slate-500 hover:bg-slate-100">
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ meta: [...value.meta, { key: "", value: "" }] })} className="mt-2 text-sm font-medium text-violet-700 hover:underline">
          + Agregar dato
        </button>
      </fieldset>
    </div>
  );
}

/** Lo que se manda a la API: tags como array, sin filas vacías. */
export function toPayload(value: MetadataValue) {
  return {
    name: value.name,
    description: value.description,
    tags: value.tags,
    meta: value.meta.filter((p) => p.key.trim() || p.value.trim()),
  };
}

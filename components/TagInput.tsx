"use client";

import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { MAX_TAGS } from "@/lib/validation";
import { TAG_SEPARATORS, addTags } from "@/lib/tags";

// Campo de tags en fichas: al escribir una coma, un punto y coma o Enter, el
// texto se convierte en una ficha. Backspace con el campo vacío borra la última.
export default function TagInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(text: string) {
    onChange(addTags(value, text, MAX_TAGS));
    setDraft("");
  }

  function handleChange(text: string) {
    // El separador puede llegar en medio (al pegar o escribir rápido).
    if (TAG_SEPARATORS.test(text)) commit(text);
    else setDraft(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // no enviar el formulario
      if (draft.trim()) commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (TAG_SEPARATORS.test(text)) {
      e.preventDefault();
      commit(draft + text);
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-violet-600 focus-within:ring-2 focus-within:ring-violet-600/20">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-violet-100 py-0.5 pl-2.5 pr-1 text-sm text-violet-900">
          #{tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Quitar el tag ${tag}`}
            className="rounded-full px-1.5 text-violet-500 hover:bg-violet-200 hover:text-violet-900"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={value.length ? "" : "viaje, playa, 2026"}
        disabled={value.length >= MAX_TAGS}
        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-base outline-none"
      />
    </div>
  );
}

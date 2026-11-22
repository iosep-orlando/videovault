import Link from "next/link";

// La portada muestra la idea de la app: diapositivas sobre una mesa de luz.
const FRAMES = ["Viaje a Córdoba", "Cumpleaños de Sofi", "Demo para el cliente"];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <h1 className="font-display max-w-3xl text-5xl leading-[1.05] font-bold tracking-tight sm:text-7xl">
        Tus vídeos, sobre la mesa.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Subilos desde el navegador, ponéles tags y datos propios, y encontralos en segundos.
        Cada cuenta ve solo sus vídeos.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/registro" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-strong">
          Crear cuenta
        </Link>
        <Link href="/videos" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium hover:bg-slate-100">
          Ir a mis vídeos
        </Link>
      </div>

      <ul aria-hidden className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {FRAMES.map((name, i) => (
          <li key={name} className={`rounded-xl bg-mount p-2 ${i === 1 ? "sm:translate-y-6 sm:-rotate-1" : i === 2 ? "sm:rotate-1" : ""}`}>
            <div className="flex aspect-video items-center justify-center rounded-md bg-gradient-to-br from-mount-soft to-black text-3xl text-white/70">▶</div>
            <p className="mt-2 px-1 pb-0.5 text-sm font-medium text-white">{name}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

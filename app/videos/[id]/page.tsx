import { Suspense } from "react";
import VideoDetail from "@/components/VideoDetail";
import { pageShell } from "@/components/ui";

export default function VideoPage() {
  return (
    <main className={pageShell}>
      <Suspense fallback={<p className="text-slate-500">Cargando…</p>}>
        <VideoDetail />
      </Suspense>
    </main>
  );
}

import VideoLibrary from "@/components/VideoLibrary";
import { pageShell } from "@/components/ui";

export default function VideosPage() {
  return (
    <main className={pageShell}>
      <VideoLibrary />
    </main>
  );
}

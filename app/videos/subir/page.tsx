import UploadForm from "@/components/UploadForm";
import { pageShell, pageTitle } from "@/components/ui";

export default function UploadPage() {
  return (
    <main className={pageShell}>
      <h1 className={`${pageTitle} mb-6`}>Subir un vídeo</h1>
      <UploadForm />
    </main>
  );
}

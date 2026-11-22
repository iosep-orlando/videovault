/**
 * Sube el fichero a la URL firmada con un PUT directo del navegador a RustFS.
 *
 * Con XMLHttpRequest y no con fetch: fetch todavía no informa del progreso de
 * una subida, y con vídeos de cientos de MB la barra de progreso importa.
 */
export function putWithProgress(
  url: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Tiene que ser el mismo Content-Type con el que se firmó la URL.
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`El almacenamiento rechazó la subida (HTTP ${xhr.status}).`));
    // Un error de red aquí suele ser CORS: RustFS no reconoce el origen.
    xhr.onerror = () => reject(new Error("No se pudo conectar con el almacenamiento de vídeos."));
    xhr.onabort = () => reject(new DOMException("Subida cancelada", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

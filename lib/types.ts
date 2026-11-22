// Modelo de datos. El vídeo (el binario) vive en S3; MongoDB solo guarda sus
// metadatos. Así listar y buscar no tocan el almacenamiento.

export interface MetaPair {
  key: string;
  value: string;
}

export type VideoStatus = "uploading" | "ready";

/** Un vídeo tal como lo ve el navegador: sin rutas internas de S3. */
export interface VideoDTO {
  id: string;
  name: string;
  description: string;
  tags: string[];
  meta: MetaPair[];
  sizeBytes: number;
  contentType: string;
  createdAt: string; // ISO
  // Solo en el listado: URL firmada para la miniatura (el propio vídeo, del
  // que el navegador pide solo los primeros fotogramas).
  previewUrl?: string;
}

export interface UserDTO {
  id: string;
  email: string;
}

export interface Stats {
  count: number;
  totalBytes: number;
  topTags: { tag: string; count: number }[]; // los más usados, para filtrar con un clic
}

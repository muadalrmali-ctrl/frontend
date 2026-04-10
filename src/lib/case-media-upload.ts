import { apiClient } from "@/providers/api-client";

export const MAX_CASE_MEDIA_FILE_BYTES = 5 * 1024 * 1024;

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type CaseMediaCategory = "post_repair" | "damaged_part" | "waiting_part";

type UploadCaseMediaResponse = {
  id: number;
  entityType: string;
  entityId: number;
  fileUrl: string;
  publicUrl: string;
  fileType: string;
  uploadedBy: number;
  createdAt?: string | null;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const validateImageFile = (file: File) => {
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("نوع الملف غير مدعوم. يرجى اختيار صورة PNG أو JPG أو WEBP أو GIF.");
  }

  if (file.size > MAX_CASE_MEDIA_FILE_BYTES) {
    throw new Error("حجم الملف كبير جدًا. الحد الأقصى المسموح به هو 5 ميجابايت.");
  }
};

export const uploadCaseImageFile = async (input: {
  caseId: number;
  mediaCategory: CaseMediaCategory;
  file: File;
}) => {
  validateImageFile(input.file);

  const contentBase64 = arrayBufferToBase64(await input.file.arrayBuffer());

  return apiClient<UploadCaseMediaResponse>("/api/media/upload-case-file", {
    method: "POST",
    body: {
      entityType: "case",
      entityId: input.caseId,
      mediaCategory: input.mediaCategory,
      fileName: input.file.name,
      mimeType: input.file.type,
      fileSizeBytes: input.file.size,
      contentBase64,
    },
  });
};

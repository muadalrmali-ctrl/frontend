import { apiClient } from "@/providers/api-client";

export const MAX_CASE_IMAGE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CASE_VIDEO_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_CASE_AUDIO_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CASE_MEDIA_FILE_BYTES = MAX_CASE_IMAGE_FILE_BYTES;

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const SUPPORTED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);

export type CaseMediaCategory =
  | "branch_handoff"
  | "center_receipt"
  | "repair_completion"
  | "not_repairable"
  | "product_image"
  | "damaged_part_image"
  | "general"
  | "waiting_part"
  | "post_repair"
  | "damaged_part";

type UploadCaseMediaKind = "image" | "video" | "audio";

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

const validateCaseMediaFile = (file: File, kind: UploadCaseMediaKind) => {
  const supportedMimeTypes =
    kind === "video"
      ? SUPPORTED_VIDEO_MIME_TYPES
      : kind === "audio"
        ? SUPPORTED_AUDIO_MIME_TYPES
        : SUPPORTED_IMAGE_MIME_TYPES;

  const maxFileBytes =
    kind === "video"
      ? MAX_CASE_VIDEO_FILE_BYTES
      : kind === "audio"
        ? MAX_CASE_AUDIO_FILE_BYTES
        : MAX_CASE_IMAGE_FILE_BYTES;

  if (!supportedMimeTypes.has(file.type)) {
    throw new Error(
      kind === "video"
        ? "نوع الملف غير مدعوم. يرجى اختيار فيديو MP4 أو MOV أو WEBM."
        : kind === "audio"
          ? "نوع الملف غير مدعوم. يرجى اختيار ملف صوتي MP3 أو WAV أو OGG أو WEBM أو M4A."
          : "نوع الملف غير مدعوم. يرجى اختيار صورة PNG أو JPG أو WEBP أو GIF."
    );
  }

  if (file.size > maxFileBytes) {
    throw new Error(
      kind === "video"
        ? "حجم الفيديو كبير جدًا. الحد الأقصى المسموح به هو 25 ميجابايت."
        : kind === "audio"
          ? "حجم الملف الصوتي كبير جدًا. الحد الأقصى المسموح به هو 10 ميجابايت."
          : "حجم الملف كبير جدًا. الحد الأقصى المسموح به هو 5 ميجابايت."
    );
  }
};

const uploadCaseMediaFile = async (input: {
  caseId: number;
  mediaCategory: CaseMediaCategory;
  file: File;
  kind: UploadCaseMediaKind;
}) => {
  validateCaseMediaFile(input.file, input.kind);

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

export const uploadCaseImageFile = (input: {
  caseId: number;
  mediaCategory: CaseMediaCategory;
  file: File;
}) =>
  uploadCaseMediaFile({
    ...input,
    kind: "image",
  });

export const uploadCaseVideoFile = (input: {
  caseId: number;
  mediaCategory: CaseMediaCategory;
  file: File;
}) =>
  uploadCaseMediaFile({
    ...input,
    kind: "video",
  });

export const uploadCaseAudioFile = (input: {
  caseId: number;
  mediaCategory: CaseMediaCategory;
  file: File;
}) =>
  uploadCaseMediaFile({
    ...input,
    kind: "audio",
  });

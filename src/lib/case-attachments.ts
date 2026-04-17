export type CaseAttachmentType = "image" | "video" | "audio";

export type CaseAttachmentCategory =
  | "branch_handoff"
  | "center_receipt"
  | "repair_completion"
  | "not_repairable"
  | "product_image"
  | "damaged_part_image"
  | "general"
  | "waiting_part";

export type CaseAttachment = {
  id: string;
  caseId: number;
  type: CaseAttachmentType;
  category: CaseAttachmentCategory;
  fileName: string;
  filePath?: string | null;
  publicUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt?: string | null;
  uploadedBy?: number | null;
  source: "api" | "legacy";
};

export type RawCaseAttachment = {
  id: number;
  entityType: string;
  entityId: number;
  caseId?: number | null;
  category?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  publicUrl?: string | null;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileType: string;
  uploadedBy?: number | null;
  createdAt?: string | null;
};

type LegacyAttachmentGroupInput = {
  caseId: number;
  urls: string[];
  type: CaseAttachmentType;
  category: CaseAttachmentCategory;
  prefix: string;
};

const normalizeCategory = (value?: string | null): CaseAttachmentCategory => {
  switch (value) {
    case "post_repair":
      return "repair_completion";
    case "damaged_part":
      return "damaged_part_image";
    case "repair_completion":
    case "branch_handoff":
    case "center_receipt":
    case "not_repairable":
    case "product_image":
    case "damaged_part_image":
    case "general":
    case "waiting_part":
      return value;
    default:
      return "general";
  }
};

const normalizeType = (value?: string | null): CaseAttachmentType => {
  switch (value) {
    case "video":
      return "video";
    case "audio":
      return "audio";
    default:
      return "image";
  }
};

const inferFileNameFromUrl = (value: string) => {
  const cleanValue = value.split("?")[0] || value;
  const segments = cleanValue.split("/");
  return decodeURIComponent(segments[segments.length - 1] || "attachment");
};

export const normalizeCaseAttachments = (items: RawCaseAttachment[] | null | undefined): CaseAttachment[] =>
  (items ?? [])
    .filter((item) => item.entityType === "case" && Boolean(item.publicUrl || item.fileUrl))
    .map((item) => ({
      id: `api-${item.id}`,
      caseId: item.caseId ?? item.entityId,
      type: normalizeType(item.fileType),
      category: normalizeCategory(item.category),
      fileName: item.fileName || inferFileNameFromUrl(item.publicUrl || item.fileUrl),
      filePath: item.filePath ?? null,
      publicUrl: item.publicUrl || item.fileUrl,
      mimeType: item.mimeType ?? null,
      sizeBytes: item.sizeBytes ?? null,
      createdAt: item.createdAt ?? null,
      uploadedBy: item.uploadedBy ?? null,
      source: "api",
    }));

const buildLegacyAttachmentsGroup = (input: LegacyAttachmentGroupInput): CaseAttachment[] =>
  input.urls.map((url, index) => ({
    id: `legacy-${input.prefix}-${index}-${url}`,
    caseId: input.caseId,
    type: input.type,
    category: input.category,
    fileName: inferFileNameFromUrl(url),
    publicUrl: url,
    source: "legacy",
  }));

export const buildLegacyCaseAttachments = (input: {
  caseId: number;
  repairImages?: string[];
  repairVideos?: string[];
  damagedPartImages?: string[];
}) => [
  ...buildLegacyAttachmentsGroup({
    caseId: input.caseId,
    urls: input.repairImages ?? [],
    type: "image",
    category: "repair_completion",
    prefix: "repair-images",
  }),
  ...buildLegacyAttachmentsGroup({
    caseId: input.caseId,
    urls: input.repairVideos ?? [],
    type: "video",
    category: "repair_completion",
    prefix: "repair-videos",
  }),
  ...buildLegacyAttachmentsGroup({
    caseId: input.caseId,
    urls: input.damagedPartImages ?? [],
    type: "image",
    category: "damaged_part_image",
    prefix: "damaged-images",
  }),
];

export const mergeCaseAttachments = (...groups: CaseAttachment[][]): CaseAttachment[] => {
  const deduped = new Map<string, CaseAttachment>();

  for (const attachment of groups.flat()) {
    const key = [attachment.type, attachment.category, attachment.publicUrl].join("::");
    if (!deduped.has(key) || deduped.get(key)?.source === "legacy") {
      deduped.set(key, attachment);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
};

export const filterAttachments = (
  attachments: CaseAttachment[],
  filters: {
    type?: CaseAttachmentType;
    category?: CaseAttachmentCategory;
  }
) =>
  attachments.filter((attachment) => {
    if (filters.type && attachment.type !== filters.type) return false;
    if (filters.category && attachment.category !== filters.category) return false;
    return true;
  });

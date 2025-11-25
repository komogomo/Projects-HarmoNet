export interface BoardAttachmentSettings {
  maxSizePerFileBytes: number;
  maxCountPerPost: number | null;
  allowedMimeTypes: string[];
}

const DEFAULT_MAX_SIZE_PER_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_COUNT_PER_POST: number | null = 5;
const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
];

export function getBoardAttachmentSettingsForTenant(
  _tenantId: string,
): BoardAttachmentSettings {
  return {
    maxSizePerFileBytes: DEFAULT_MAX_SIZE_PER_FILE_BYTES,
    maxCountPerPost: DEFAULT_MAX_COUNT_PER_POST,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
  };
}

export const BOARD_ATTACHMENT_DEFAULTS: BoardAttachmentSettings = {
  maxSizePerFileBytes: DEFAULT_MAX_SIZE_PER_FILE_BYTES,
  maxCountPerPost: DEFAULT_MAX_COUNT_PER_POST,
  allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
};

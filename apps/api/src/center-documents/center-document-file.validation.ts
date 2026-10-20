import { assertValidUploadDataUrl } from "../common/upload-file.validation";

export function assertValidCenterDocumentFile(fileName: string, mimeType: string, dataUrl: string): void {
  assertValidUploadDataUrl(fileName, mimeType, dataUrl);
}

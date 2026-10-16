export interface AttachmentSnapshot {
  version: 1;
  status: 'complete' | 'partial' | 'pending' | 'unavailable';
  source: 'office' | 'graph' | 'crm';
  capturedAt: string;
  files: { name: string; size?: number }[];
  totalKnown: number | null;
}
declare global {
  interface Window {
    DtsEmailAttachments: {
      capture(item: any): Promise<AttachmentSnapshot>;
      sameItem(item: any, current: any, expectedId?: string): boolean;
    };
  }
}

import apiClient from './apiClient';
import { resolvedEmailWindow } from '../utils/resolvedEmailWindow';
export type ReplyMode = 'reply' | 'reply_all';
export function prepareVerifiedReplyInWeb(activityId: string, mode: ReplyMode, candidateId?: string) {
  return resolvedEmailWindow(async () => (await apiClient.post(`/exchange-sync/emails/${encodeURIComponent(activityId)}/reply`, { mode, candidateId })).data);
}

import apiClient from './apiClient';

export interface CustomerSegment {
  segment_code: string;
  potential_amount: string | null;
  billing_amount: string | null;
  version: number;
  updated_at: string | null;
}
export interface CustomerSegmentsResponse {
  items: CustomerSegment[];
  catalog: { value: string; label: string }[];
  canEdit: boolean;
  unclassified_amount: string;
  unclassified_lines: number;
}
const url = (id: string) => '/customers/code/' + encodeURIComponent(id) + '/segments';
export const getCustomerSegments = async (id: string) => (await apiClient.get<CustomerSegmentsResponse>(url(id))).data;
export const saveCustomerSegment = async (id: string, segment: string, potential_amount: string | null, version: number) => (
  await apiClient.put<CustomerSegment>(url(id) + '/' + encodeURIComponent(segment), { potential_amount, version })
).data;
export const removeCustomerSegment = async (id: string, segment: string, version: number) => (
  await apiClient.delete(url(id) + '/' + encodeURIComponent(segment), { params: { version } })
).data;

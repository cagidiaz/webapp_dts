import apiClient from './apiClient';
export type CutAccess={enabled:boolean;canCreate:boolean;canViewAll:boolean;automaticEnabled?:boolean};
export type PipelineCut={id:string;kind:string;status:string;reason?:string;scheduled_at:string|null;captured_at:string|null;created_at?:string;row_count?:number;attempts?:number;retry_at?:string;lease_until?:string;error_message?:string;rules_version:string;supersedes_id?:string};
export type CutRow={id:string;entity_type:string;entity_key:string;phase:string;source:string;amount:string|null;probability:string|null;payload:Record<string,any>};
export const getCutAccess=async()=>(await apiClient.get<CutAccess>('/crm-pipeline-cuts/access')).data;
export const getPipelineCuts=async()=>(await apiClient.get<PipelineCut[]>('/crm-pipeline-cuts')).data;
export const getPipelineCut=async(id:string)=>(await apiClient.get<{cut:PipelineCut;rows:CutRow[];total:number}>(`/crm-pipeline-cuts/${id}`)).data;
export const createPipelineCut=async(data:{request_id:string;reason:string;supersedes_id?:string})=>(await apiClient.post<PipelineCut>('/crm-pipeline-cuts',data)).data;
export const retryPipelineCut=async(id:string)=>(await apiClient.post<PipelineCut>(`/crm-pipeline-cuts/${id}/retry`)).data;
export const getCutReports=async(id:string)=>(await apiClient.get(`/crm-pipeline-cuts/${id}/reports`)).data;
export const comparePipelineCuts=async(id:string,baseline:string)=>(await apiClient.get(`/crm-pipeline-cuts/${id}/compare/${baseline}`)).data;
export async function downloadPipelineCut(id:string) {
 const {data}=await apiClient.get(`/crm-pipeline-cuts/${id}/export`,{responseType:'blob'});
 const url=URL.createObjectURL(data),link=document.createElement('a');link.href=url;link.download=`corte-${id}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

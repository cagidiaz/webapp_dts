import apiClient from './apiClient';

export interface UserManual {
  id: string; title: string; description: string; version: string; updatedAt: string; sizeBytes: number;
}

export const getUserManuals = async (): Promise<UserManual[]> => (await apiClient.get('/documentation/manuals')).data;

export async function openUserManual(manual: UserManual, download: boolean) {
  const popup = download ? null : window.open('about:blank', '_blank');
  if (!download && !popup) throw new Error('Permite las ventanas emergentes para ver el manual o utiliza Descargar PDF.');
  if (popup) { popup.opener = null; popup.document.title = 'Manual de usuario CRM'; popup.document.body.textContent = 'Cargando el manual…'; }
  try {
    const response = await apiClient.get<Blob>(`/documentation/manuals/${encodeURIComponent(manual.id)}/pdf`, { responseType: 'blob', params: { download: download ? '1' : undefined } });
    if (!response.data.type.toLowerCase().includes('application/pdf')) throw new Error('No se ha recibido un PDF válido. Vuelve a intentarlo.');
    const url = URL.createObjectURL(response.data);
    if (download) {
      const link = document.createElement('a');
      link.href = url; link.download = `manual-${manual.id}-v${manual.version}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (popup && !popup.closed) {
      popup.location.replace(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else URL.revokeObjectURL(url);
  } catch (error) { popup?.close(); throw error; }
}

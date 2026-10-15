/** Datos de presentación del contacto, leídos de contacts sin duplicarlos en seguimiento. */
export async function loadOfferContacts(db: any, rows: any[]) {
  const ids = [...new Set(rows.filter(row => row.source !== 'BC').map(row => row.contacto_id).filter(Boolean))];
  const contacts = ids.length ? await db.contacts.findMany({
    where: { contact_no: { in: ids } },
    select: { id: true, contact_no: true, name: true, email: true, phone_no: true, mobile_no: true },
  }) : [];
  const byId = new Map<string, any>(contacts.map((contact: any) => [contact.contact_no, contact]));
  return rows.map(row => {
    if (row.source === 'BC') return row;
    const contact = byId.get(row.contacto_id);
    return { ...row, contacto_uuid: contact?.id ?? null, contacto_nombre: contact?.name ?? null, contacto_email: contact?.email ?? null,
      contacto_telefono: contact?.phone_no || contact?.mobile_no || null };
  });
}

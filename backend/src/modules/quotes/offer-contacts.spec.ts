import { loadOfferContacts } from './offer-contacts';
import { OfferSourceContext } from './offer-source-context';

describe('Contacto vinculado sin datos duplicados en seguimiento', () => {
  const row = { document_no: 'OF1', source: 'APP', contacto_id: 'CT-001', contacto_nombre: 'Nombre antiguo', contacto_email: 'antiguo@test' };
  it('resuelve el código BC y muestra los valores actuales de contacts', async () => {
    const db = { contacts: { findMany: jest.fn().mockResolvedValue([{ id: 'internal-uuid', contact_no: 'CT-001', name: 'Nombre actual', email: 'actual@test', phone_no: null, mobile_no: '600123456' }]) } };
    const context = new OfferSourceContext(await loadOfferContacts(db, [row, { ...row, document_no: 'OF2' }]));
    const result = context.overlay({ document_no: 'OF1', sales_quotes_crm: { contacto_email: 'heredado@test' } });
    expect(result).toEqual(expect.objectContaining({ contacto_id: 'CT-001', contacto_nombre: 'Nombre actual', contacto_email: 'actual@test', contacto_telefono: '600123456' }));
    expect(db.contacts.findMany).toHaveBeenCalledTimes(1);
    expect(db.contacts.findMany.mock.calls[0][0].where).toEqual({ contact_no: { in: ['CT-001'] } });
    expect(context.where({ sales_quotes_crm: { contacto_nombre: 'Nombre actual' } }).AND[0].AND[0].OR[0]).toEqual({ document_no: { in: ['OF1', 'OF2'] } });
  });
  it('no recupera datos duplicados o heredados si falta el contacto vinculado', async () => {
    const db = { contacts: { findMany: jest.fn().mockResolvedValue([]) } };
    const context = new OfferSourceContext(await loadOfferContacts(db, [row]));
    const result = context.overlay({ document_no: 'OF1', sales_quotes_crm: { contacto_nombre: 'Nombre obsoleto' } });
    expect(result.contacto_id).toBe('CT-001');
    expect(result.contacto_nombre).toBeNull();
    expect(result.contacto_email).toBeNull();
    expect(result.sales_quotes_crm.contacto_nombre).toBeNull();
  });
  it('la siguiente consulta refleja cambios de contacts sin actualizar seguimiento', async () => {
    const db = { contacts: { findMany: jest.fn().mockResolvedValueOnce([{ id: 'internal-uuid', contact_no: 'CT-001', name: 'Inicial' }]).mockResolvedValueOnce([{ id: 'internal-uuid', contact_no: 'CT-001', name: 'Actualizado' }]) } };
    expect((await loadOfferContacts(db, [row]))[0].contacto_nombre).toBe('Inicial');
    expect((await loadOfferContacts(db, [row]))[0].contacto_nombre).toBe('Actualizado');
    expect(row.contacto_nombre).toBe('Nombre antiguo');
  });
  it('sin referencias APP no consulta contacts ni altera el flujo BC', async () => {
    const db = { contacts: { findMany: jest.fn() } };
    const bc = { ...row, source: 'BC' };
    expect((await loadOfferContacts(db, [bc]))[0]).toBe(bc);
    expect(db.contacts.findMany).not.toHaveBeenCalled();
  });
  it('mantiene el filtro por UUID de la vista de contactos y también admite el código BC', async () => {
    const uuid = '60000000-0000-4000-8000-000000000001';
    const db = { contacts: { findMany: jest.fn().mockResolvedValue([{ id: uuid, contact_no: 'CT-001', name: 'Actual' }]) } };
    const context = new OfferSourceContext(await loadOfferContacts(db, [row]));
    for (const reference of [uuid, 'CT-001']) {
      expect(context.where({ sales_quotes_crm: { contacto_id: reference } }).AND[0].AND[0].OR[0]).toEqual({ document_no: { in: ['OF1'] } });
    }
  });
});

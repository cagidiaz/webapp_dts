import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProspectActivityDto } from './prospect.dto';

describe('Validación de actividades locales', () => {
  const options = { whitelist: true, forbidNonWhitelisted: true };
  const base = { type: 'CALL', title: 'Seguimiento', due_date: '2026-10-16', time_scheduled: '18:00', is_completed: false };
  it('rechaza campos de autor, vínculo y versión no aceptados en altas', async () => {
    const errors = await validate(plainToInstance(ProspectActivityDto, { ...base, created_by: 'foreign', prospect_id: 'foreign', version: 200 }), options);
    expect(errors.map(error => error.property).sort()).toEqual(['created_by', 'prospect_id', 'version']);
  });
  it('rechaza tipos no implementados, horarios inválidos y estados enviados como texto', async () => {
    const errors = await validate(plainToInstance(ProspectActivityDto, { ...base, type: 'EMAIL', time_scheduled: '25:61', is_completed: 'false' }), options);
    expect(errors.map(error => error.property).sort()).toEqual(['is_completed', 'time_scheduled', 'type']);
  });
  it('normaliza blancos opcionales y conserva el día civil sin conversión de huso', async () => {
    const dto = plainToInstance(ProspectActivityDto, { ...base, title: '  Seguimiento  ', description: '  ' });
    expect(await validate(dto, options)).toEqual([]);
    expect(dto.title).toBe('Seguimiento');
    expect(dto.description).toBeNull();
    expect(dto.due_date).toBe('2026-10-16');
  });
});

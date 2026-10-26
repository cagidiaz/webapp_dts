import { createClient } from '@supabase/supabase-js';
import { UsersService } from './users.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

describe('UsersService: validación TLS', () => {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  afterEach(() => {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    jest.clearAllMocks();
  });

  it('no desactiva la validación global al crear el servicio', () => {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    new UsersService();
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
    expect(createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it('respeta la validación explícita del entorno', () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    new UsersService();
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('1');
  });
});

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private supabaseAdmin;

  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async createUser(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName, roleId } = createUserDto;
    
    const { data: user, error } = await this.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName, roleId }
    });

    if (error) throw new InternalServerErrorException(error.message);

    const { error: profileError } = await this.supabaseAdmin.from('profiles').upsert({
      id: user.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      is_active: true,
      role_id: roleId
    });

    if (profileError) throw new InternalServerErrorException(profileError.message);
    return user.user;
  }

  async getUsers() {
    const { data, error } = await this.supabaseAdmin
      .from('profiles')
      .select('*, roles(id, name)');
      
    if (error) throw new InternalServerErrorException(error.message);

    return data.map(p => ({
      id: p.id,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      isActive: p.is_active,
      roles: Array.isArray(p.roles) ? p.roles[0] : p.roles
    }));
  }

  async getRoles() {
    const { data, error } = await this.supabaseAdmin.from('roles').select('id, name');
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async getUserStatus(userId: string) {
    try {
      const { data: profile, error } = await this.supabaseAdmin
        .from('profiles')
        .select('*, roles(name)')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return {
          userId,
          existsInProfiles: false,
          error: error?.message || 'No profile found in public.profiles',
          tip: 'Tu usuario existe en Auth pero no en la tabla profiles. Ejecuta el SQL proporcionado para registrarte como admin.'
        };
      }

      let roleName = '';
      if (profile.roles) {
         roleName = Array.isArray(profile.roles) ? profile.roles[0]?.name : profile.roles.name;
      }

      return {
        userId,
        existsInProfiles: true,
        email: profile.email,
        role: roleName,
        isAdmin: roleName?.toLowerCase() === 'admin',
        rawProfile: profile
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  async updateUser(id: string, updateUserDto: any) {
    const { email, password, firstName, lastName, roleId, isActive } = updateUserDto;
    if (email || password) {
       await this.supabaseAdmin.auth.admin.updateUserById(id, { email, password });
    }
    const { data, error } = await this.supabaseAdmin.from('profiles').update({
       ...(email && { email }),
       ...(firstName && { first_name: firstName }),
       ...(lastName && { last_name: lastName }),
       ...(roleId && { role_id: roleId }),
       ...(typeof isActive === 'boolean' && { is_active: isActive }),
    }).eq('id', id).select().single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async deleteUser(id: string) {
    await this.supabaseAdmin.auth.admin.deleteUser(id);
    await this.supabaseAdmin.from('profiles').delete().eq('id', id);
    return { success: true };
  }
}

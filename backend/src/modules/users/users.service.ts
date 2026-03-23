import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private supabaseAdmin;

  constructor() {
    // Configured with service role to bypass RLS and allow creating users via Admin API
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Creates a user in Supabase Auth and inserts info in public.profiles.
   * Supabase automatically creates users but here you get full control using Admin api.
   */
  async createUser(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;
    // Create auth user
    const { data: user, error } = await this.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // auto confirm for admin created users
    });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Insert to profiles (if there is no trigger that already does it)
    const { error: profileError } = await this.supabaseAdmin.from('profiles').insert({
      id: user.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      is_active: true
    });

    if (profileError) {
      // rollback or handle error
      throw new InternalServerErrorException(profileError.message);
    }

    return user.user;
  }

  /**
   * Fetch all profiles
   */
  async getUsers() {
    const { data, error } = await this.supabaseAdmin.from('profiles').select('*');
    if (error) {
       throw new InternalServerErrorException(error.message);
    }
    return data;
  }
}

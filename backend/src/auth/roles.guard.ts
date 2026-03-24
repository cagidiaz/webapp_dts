import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from '@supabase/supabase-js';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private supabaseAdmin;

  constructor(
    private reflector: Reflector,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.userId) {
       console.error('Guard Error: User not found in request');
       return false;
    }

    // Fetch user profile and associated role from Supabase Admin API
    const { data: profile, error } = await this.supabaseAdmin
      .from('profiles')
      .select('*, roles(name)')
      .eq('id', user.userId)
      .single();

    if (error || !profile) {
      console.error('Guard Error Reading Roles (Query):', error || 'No profile found');
      throw new ForbiddenException('Error verifying permissions or missing profile');
    }

    // Handle Supabase join result (can be object or array)
    let userRoleName = '';
    if (profile.roles) {
      if (Array.isArray(profile.roles)) {
        userRoleName = profile.roles[0]?.name || '';
      } else {
        userRoleName = profile.roles.name || '';
      }
    }

    if (!userRoleName) {
      console.error('Guard Error: User has no assigned role name', { profile });
      throw new ForbiddenException('User has no assigned role');
    }

    // Case-insensitive comparison
    const hasRole = requiredRoles.some(
      (role) => userRoleName.toLowerCase() === role.toLowerCase()
    );
    
    if (!hasRole) {
      console.error('Guard Error: Role mismatch', { expected: requiredRoles, actual: userRoleName });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}



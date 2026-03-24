import { create } from 'zustand';
import { supabase } from '../api/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  roles?: {
    name: string;
  };
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  setSession: (session: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  setSession: async (session) => {
    // Only fetch if session changed or user present
    set({ session, user: session?.user ?? null });
    
    if (session?.user) {
      try {
        let profileData: any = null;

        // Step 1: Normal Search by ID (standard PK)
        const { data: byId } = await supabase
          .from('profiles')
          .select('*, roles:role_id(name)')
          .eq('id', session.user.id)
          .maybeSingle();
        
        profileData = byId;

        // Step 2: Email Search fallback (in case IDs were not synced during manual creation)
        if (!profileData && session.user.email) {
          const { data: byEmail } = await supabase
            .from('profiles')
            .select('*, roles:role_id(name)')
            .ilike('email', session.user.email.trim())
            .maybeSingle();
          profileData = byEmail;
        }

        if (profileData) {
          // Successfully found and loaded profile from DB
          set({ 
            profile: { 
              id: profileData.id,
              firstName: profileData.first_name || 'Usuario',
              lastName: profileData.last_name || '',
              email: profileData.email,
              roleId: profileData.role_id,
              roles: { name: (profileData.roles as any)?.name || 'Usuario' }
            }
          });
        } else {
          // Fallback if user exists in Auth but NOT in public.profiles table
          const metadata = session.user.user_metadata || {};
          set({ 
            profile: { 
              id: session.user.id,
              firstName: metadata.firstName || 'Usuario',
              lastName: metadata.lastName || 'Invitado',
              email: session.user.email || '',
              roleId: '',
              roles: { name: 'INVITADO' } 
            } 
          });
        }
        
      } catch (err) {
        console.error('Critical AuthStore Error:', err);
        set({ profile: null });
      }
    } else {
      set({ profile: null });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));

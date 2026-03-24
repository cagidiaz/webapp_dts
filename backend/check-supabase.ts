import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('Checking with Supabase Client...');
  const { data: roles, error: errRoles } = await supabase.from('roles').select('*');
  console.log('Roles:', roles || errRoles);

  const { data: profiles, error: errProfiles } = await supabase.from('profiles').select('*, roles(name)');
  console.log('Profiles:', profiles || errProfiles);
}

check();

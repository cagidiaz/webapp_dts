import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('income_statements').select('account_id, account_name').limit(15);
  if (error) return;
  data.forEach(d => console.log(`${d.account_id}: ${d.account_name}`));
}

inspect();

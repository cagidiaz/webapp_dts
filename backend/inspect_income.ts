import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Inspecting Income Statements IDs...');
  
  const { data, error } = await supabase.from('income_statements').select('account_id, account_name, year').limit(20);
  
  if (error) {
     console.error(`Error reading income statements:`, error.message);
     return;
  }
  
  console.log('\nAccount IDs in Income Statements:');
  console.log(JSON.stringify(data, null, 2));
}

inspect();

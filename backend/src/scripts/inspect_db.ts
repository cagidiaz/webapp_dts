import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Inspecting Supabase Tables...');
  
  const tables = ['financial_balances', 'income_statements'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
       console.error(`Error reading ${table}:`, error.message);
       continue;
    }
    
    console.log(`\n--- TABLE: ${table} ---`);
    if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]).join(', '));
      console.log('Example row:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Table is empty or not found.');
    }
  }
}

inspect();

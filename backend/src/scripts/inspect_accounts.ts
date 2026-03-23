import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFull() {
  console.log('Fetching accounts Mapping for 2022...');
  
  const tables = ['financial_balances', 'income_statements'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('account_id, account_name, amount').eq('year', 2022);
    
    if (error) {
       console.error(`Error reading ${table}:`, error.message);
       continue;
    }
    
    console.log(`\n--- ACCOUNTS: ${table} ---`);
    if (data && data.length > 0) {
      data.forEach(row => {
        console.log(`[${row.account_id}] ${row.account_name}: ${row.amount}`);
      });
    } else {
      console.log('No data found for 2022');
    }
  }
}

inspectFull();

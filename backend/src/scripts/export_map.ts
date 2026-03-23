import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportAccounts() {
  const result: any = {};
  
  const tables = ['financial_balances', 'income_statements'];
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('account_id, account_name').eq('year', 2022);
    if (data) {
       result[table] = data.map(d => `[${d.account_id}] ${d.account_name}`);
    }
  }
  
  fs.writeFileSync('accounts_map.json', JSON.stringify(result, null, 2));
  console.log('Exported to accounts_map.json');
}

exportAccounts();

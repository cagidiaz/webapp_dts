import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data: balances } = await supabase.from('financial_balances').select('account_id, account_name, year, month, amount').in('account_id', ['1.B.III', '2.C.V.1', '1.TOT']).order('year', { ascending: false });

  console.log('--- BALANCE SHEET ACCOUNTS (CLIENTS / PROV) ---');
  console.log(JSON.stringify(balances, null, 2));
}
check();

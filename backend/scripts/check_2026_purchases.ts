import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data: income } = await supabase.from('income_statements').select('amount, year, month').eq('year', 2026).eq('account_id', 'A.4');
  console.log('--- 2026 YTD PURCHASES ---');
  console.log(JSON.stringify(income, null, 2));
}
check();

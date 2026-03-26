
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function checkA4() {
  const { data: income } = await supabase.from('income_statements').select('*').eq('year', 2026).eq('account_id', 'A.4');
  console.log('A.4 rows:', income);
  const total = income?.reduce((s, r) => s + r.amount, 0);
  console.log('Total A.4 sum:', total);
}
checkA4();

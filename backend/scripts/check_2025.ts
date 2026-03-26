import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data: income } = await supabase.from('income_statements').select('account_id, amount, year');
  
  const totals2025: any = { A1: 0, A4: 0 };
  income?.filter(r => r.year === 2025).forEach(r => {
    if (r.account_id === 'A.1') totals2025.A1 += r.amount;
    if (r.account_id === 'A.4') totals2025.A4 += Math.abs(r.amount);
  });

  console.log('--- 2025 TOTALS ---');
  console.log(totals2025);
}
check();

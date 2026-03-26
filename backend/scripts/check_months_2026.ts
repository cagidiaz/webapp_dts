
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function checkMonths() {
  const { data: income } = await supabase.from('income_statements').select('month, amount, account_id').eq('year', 2026);
  const distinctMonthsInc = [...new Set(income?.map(r => r.month))];
  console.log('Months in income_statements 2026:', distinctMonthsInc);

  const { data: balance } = await supabase.from('financial_balances').select('month, amount, account_id').eq('year', 2026);
  const distinctMonthsBal = [...new Set(balance?.map(r => r.month))];
  console.log('Months in financial_balances 2026:', distinctMonthsBal);
}

checkMonths();


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function checkBudget2026() {
  const { data: budgets } = await supabase.from('budgets').select('*');
  const b26 = budgets?.filter(r => new Date(r.date).getFullYear() === 2026);
  
  const grouped: Record<string, number> = {};
  b26?.forEach(r => {
    grouped[r.account_code] = (grouped[r.account_code] || 0) + r.amount;
  });
  console.log('2026 Budget Sum per code:', grouped);
}
checkBudget2026();


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function check60Budget() {
  const { data: budgets } = await supabase.from('budgets').select('*');
  const b26 = budgets?.filter(r => new Date(r.date).getFullYear() === 2026 && r.account_code.toString().startsWith('60'));
  const total = b26?.reduce((s, r) => s + r.amount, 0);
  console.log('Total Budget for A.4 (60xxx) in 2026:', total);
}
check60Budget();

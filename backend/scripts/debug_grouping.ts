import { groupDataByYear } from '../frontend/src/api/finance';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function debug() {
  const { data: incomeRows } = await supabase.from('income_statements').select('*');
  const { data: budgetRows } = await supabase.from('budgets').select('*');
  const { data: salesBudgets } = await supabase.from('sales_budgets').select('*');

  // Prepare budgetRows as expected by frontend
  const budgets = budgetRows.map(r => ({ ...r, date: r.date })); 

  const result = groupDataByYear(incomeRows as any, false, budgets as any);
  const data2026 = result.find(d => d.year === 2026);

  console.log('2026 Processed Object:');
  console.log(JSON.stringify(data2026, null, 2));
}
debug();

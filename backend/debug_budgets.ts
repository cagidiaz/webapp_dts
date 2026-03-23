import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBudgets() {
  console.log("Checking Budgets from:", supabaseUrl);
  const { data, error } = await supabase.from('budgets').select('*').limit(20);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Found rows:", data.length);
  data.forEach((row: any) => {
    console.log(`Row ID: ${row.id} - Date: ${row.date} - Code: ${row.account_code} - ${row.account_name} - Amount: ${row.amount}`);
  });
}

debugBudgets();

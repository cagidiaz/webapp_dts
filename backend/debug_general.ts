import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/proyectos/webapp_dts/frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGeneral() {
  console.log("Checking Financial Balances from:", supabaseUrl);
  const { data: bData, error: bError } = await supabase.from('financial_balances').select('*').limit(5);
  console.log("Financial Balances rows:", bData?.length || 0);
  
  const { data: iData, error: iError } = await supabase.from('income_statements').select('*').limit(5);
  console.log("Income Statements rows:", iData?.length || 0);

  const { data: buData, error: buError } = await supabase.from('budgets').select('*').limit(5);
  console.log("Budgets rows:", buData?.length || 0);
  if (buData && buData.length > 0) {
    console.log("Budget sample:", buData[0]);
  }
}

debugGeneral();

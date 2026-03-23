import { supabase } from './supabase';

export interface FinancialDataRow {
  account_id: string;
  account_name: string;
  year: number;
  month?: number;
  amount: number;
}

export interface BudgetDataRow {
  id: string;
  account_code: number;
  account_name: string;
  date: string;
  amount: number;
}

export const getBalanceData = async () => {
  const { data, error } = await supabase
    .from('financial_balances')
    .select('account_id, account_name, year, month, amount')
    .order('year', { ascending: false });

  if (error) throw error;
  return data as FinancialDataRow[];
};

export const getIncomeStatementData = async () => {
  const { data, error } = await supabase
    .from('income_statements')
    .select('account_id, account_name, year, month, amount')
    .order('year', { ascending: false });

  if (error) throw error;
  return data as FinancialDataRow[];
};

export const getBudgetsData = async () => {
  const { data, error } = await supabase
    .from('budgets')
    .select('id, account_code, account_name, date, amount')
    .order('date', { ascending: false });

  if (error) throw error;
  return data as BudgetDataRow[];
};

/**
 * Maps standard PGC accounting codes to the app's internal P&L structure IDs
 */
export const mapBudgetToAccountId = (accountCode: number): string => {
  const codeStr = accountCode.toString();
  if (codeStr.startsWith('70') || codeStr.startsWith('74') || codeStr.startsWith('75')) return 'A.1'; // Ventas / Ingresos
  if (codeStr.startsWith('60')) return 'A.4'; // Aprovisionamientos
  if (codeStr.startsWith('64')) return 'A.6'; // Gastos de Personal
  if (codeStr.startsWith('62') || codeStr.startsWith('63') || codeStr.startsWith('67')) return 'A.7'; // Otros Gastos de Explotación / Tributos
  if (codeStr.startsWith('68')) return 'A.8'; // Amortización
  if (codeStr.startsWith('76')) return 'A.12'; // Ingresos Financieros
  if (codeStr.startsWith('66')) return 'A.13'; // Gastos Financieros
  return 'UNKNOWN';
};

/**
 * Groups raw budget rows into a structured object indexed by year and internal account_id
 */
export const groupBudgetsByYear = (rows: BudgetDataRow[]) => {
  const grouped: Record<number, Record<string, number>> = {};
  
  rows.forEach(row => {
    const year = new Date(row.date).getFullYear();
    if (!grouped[year]) grouped[year] = {};
    
    const internalId = mapBudgetToAccountId(row.account_code);
    if (internalId !== 'UNKNOWN') {
       grouped[year][internalId] = (grouped[year][internalId] || 0) + row.amount;
    }
  });

  return Object.entries(grouped).map(([yearStr, accounts]) => ({
    year: parseInt(yearStr),
    isBudget: true,
    ...accounts
  })).sort((a,b) => b.year - a.year);
};

/**
 * Helper to process the flat DB rows into a year-grouped structure for Recharts/Tables
 */
export const groupDataByYear = (rows: FinancialDataRow[], isBalance: boolean = false) => {
  const grouped: Record<number, { accounts: Record<string, {amount: number, month: number}>, maxMonth: number }> = {};
  
  rows.forEach(row => {
    if (!grouped[row.year]) {
      grouped[row.year] = { accounts: {}, maxMonth: 0 };
    }
    
    const rowMonth = row.month || 12; // Default to 12 if missing to avoid projecting old years
    if (rowMonth > grouped[row.year].maxMonth) {
      grouped[row.year].maxMonth = rowMonth;
    }

    if (isBalance) {
      // Balance Sheets are snapshots. Only keep the most recent month's data for each account.
      const current = grouped[row.year].accounts[row.account_id];
      if (!current || rowMonth >= current.month) {
        grouped[row.year].accounts[row.account_id] = { amount: row.amount, month: rowMonth };
      }
    } else {
      // Income statements are flows. Sum the data across all months.
      const current = grouped[row.year].accounts[row.account_id] || { amount: 0, month: rowMonth };
      grouped[row.year].accounts[row.account_id] = { amount: current.amount + row.amount, month: rowMonth };
    }
  });
  
  const currentYear = new Date().getFullYear();
  
  return Object.entries(grouped)
    .map(([yearStr, data]) => {
      const year = parseInt(yearStr);
      const isEstimate = year === currentYear && data.maxMonth > 0 && data.maxMonth < 12;
      
      const estimatedAccounts: Record<string, number> = {};
      
      // First, calculate raw or extrapolated amounts for each line
      Object.entries(data.accounts).forEach(([accountId, accData]) => {
        let multiplier = 1;

        if (isEstimate) {
          if (!isBalance) {
            // Income Statement (Flows): Linear extrapolation (e.g., 2 months -> 12 months)
            multiplier = 12 / data.maxMonth;
          } else {
            // Balance Sheet (Snapshots): 
            // Corrected: Balance is a "Snapshot" of the moment. We do NOT extrapolate 
            // by time, as the balance current on Feb is already the snapshot at that date.
            multiplier = 1; 
          }
        }
        estimatedAccounts[accountId] = accData.amount * multiplier;
      });

      // Special handling: re-calculate totals to ensure tree consistency
      if (isBalance) {
        // Total Activo (1.TOT) = Fix (1.A) + Circular (1.B)
        estimatedAccounts['1.TOT'] = (estimatedAccounts['1.A'] || 0) + (estimatedAccounts['1.B'] || 0);
        // Total P+PN (2.TOT) = PN (2.A) + Non-Curr (2.B) + Corr (2.C)
        estimatedAccounts['2.TOT'] = (estimatedAccounts['2.A'] || 0) + (estimatedAccounts['2.B'] || 0) + (estimatedAccounts['2.C'] || 0);
      }

      return {
        year,
        isEstimate,
        ...estimatedAccounts,
      };
    })
    .sort((a, b) => b.year - a.year) // Sort years descending
    .slice(0, 4); // Keep only the 4 most recent years
};

export const saveForecastScenario = async (
  name: string, 
  description: string, 
  lines: { account_id: string, period_date: string, budget_amount: number }[]
) => {
  // 1. Create scenario
  const { data: scenario, error: sError } = await supabase
    .from('forecast_scenarios')
    .insert([{ name, description }])
    .select()
    .single();

  if (sError) throw sError;

  // 2. Create lines
  const linesWithId = lines.map(line => ({
    ...line,
    scenario_id: scenario.id
  }));

  const { error: lError } = await supabase
    .from('forecast_lines')
    .insert(linesWithId);

  if (lError) {
    // Cleanup scenario if lines fail
    await supabase.from('forecast_scenarios').delete().eq('id', scenario.id);
    throw lError;
  }

  return scenario;
};

export const getForecastScenarios = async () => {
  const { data, error } = await supabase
    .from('forecast_scenarios')
    .select('*, forecast_lines(*)');

  if (error) throw error;
  return data;
};

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
  const { data: genericData, error: genericError } = await supabase
    .from('budgets')
    .select('id, account_code, account_name, date, amount')
    .order('date', { ascending: false });

  if (genericError) throw genericError;

  const { data: salesData, error: salesError } = await supabase
    .from('sales_budgets')
    .select('id, budget_date, monthly_budget');

  if (salesError) {
    console.error('Error fetching sales_budgets', salesError);
    return genericData as BudgetDataRow[]; // Fallback
  }

  let mergedData = genericData as BudgetDataRow[];

  // Filter out any basic 2026 'A.1' sales budgets to prevent duplication
  mergedData = mergedData.filter(row => {
    const is2026 = new Date(row.date).getFullYear() === 2026;
    const isSales = mapBudgetToAccountId(row.account_code) === 'A.1';
    return !(is2026 && isSales);
  });

  // Inject the new sales budgets
  if (salesData && salesData.length > 0) {
    const salesRows: BudgetDataRow[] = salesData.map(row => ({
      id: `sales_${row.id}`,
      account_code: 700000, // This maps to 'A.1' in mapBudgetToAccountId
      account_name: 'Ventas (Presupuesto 2026)',
      date: row.budget_date,
      amount: row.monthly_budget ? Number(row.monthly_budget) : 0,
    }));
    mergedData = [...mergedData, ...salesRows];
  }

  // Sort descending by date
  mergedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return mergedData;
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
export const groupDataByYear = (rows: FinancialDataRow[], isBalance: boolean = false, budgetRows?: BudgetDataRow[], incomeRowsForScaling?: FinancialDataRow[]) => {
  const grouped: Record<number, { accounts: Record<string, {amount: number, month: number}>, maxMonth: number }> = {};
  
  rows.forEach(row => {
    if (!grouped[row.year]) {
      grouped[row.year] = { accounts: {}, maxMonth: 0 };
    }
    
    const rowMonth = row.month;
    if (rowMonth && rowMonth > 0 && rowMonth <= 12) {
      if (rowMonth > (grouped[row.year].maxMonth || 0)) {
        grouped[row.year].maxMonth = rowMonth;
      }
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
      
      // 1. Initial pass: Extrapolate Income Statement (flows) 
      // and capture base snapshots for Balance Sheet
      Object.entries(data.accounts).forEach(([accountId, accData]) => {
        let multiplier = 1;
        if (year === currentYear && !isBalance) {
           const effectiveMonths = (data.maxMonth > 0 && data.maxMonth < 12) ? data.maxMonth : 2;
           multiplier = 12 / effectiveMonths;
        }

        estimatedAccounts[accountId] = accData.amount * multiplier;
        
        // Specialized copy for turnover ratios (DSO/DPO)
        if (year === currentYear && !isBalance) {
           if (accountId === 'A.1') estimatedAccounts['A.1_REAL'] = Math.abs(accData.amount * multiplier);
           if (accountId === 'A.4') estimatedAccounts['A.4_REAL'] = Math.abs(accData.amount * multiplier);
        }
      });

      // 2. Budget Overrides for Income Statement
      if (isEstimate && !isBalance && budgetRows) {
         const budgetsGrouped = groupBudgetsByYear(budgetRows);
         const budgetForYear = budgetsGrouped.find(b => b.year === year);
         if (budgetForYear) {
            Object.keys(budgetForYear).forEach(k => {
               if (k !== 'year' && k !== 'isBudget') {
                  estimatedAccounts[k] = (budgetForYear as any)[k] as number;
               }
            });
         }
      }

      // 3. Operative Scaling for Balance Sheet (NEW)
      if (isEstimate && isBalance && budgetRows && incomeRowsForScaling) {
        const budgetsGrouped = groupBudgetsByYear(budgetRows);
        const b26 = budgetsGrouped.find(b => b.year === 2026);
        
        if (b26) {
          // Find real run-rate from incomeRowsForScaling
          const realIncome26 = incomeRowsForScaling.filter(r => r.year === 2026);
          const salesReal26 = realIncome26.filter(r => r.account_id === 'A.1').reduce((s, r) => s + r.amount, 0);
          const purchReal26 = realIncome26.filter(r => r.account_id === 'A.4').reduce((s, r) => s + r.amount, 0);
          
          const maxMonthInc = Math.max(...realIncome26.map(r => r.month || 0), 1);
          const salesRunRate = (salesReal26 * (12 / maxMonthInc)) || 1;
          const purchRunRate = (Math.abs(purchReal26) * (12 / maxMonthInc)) || 1;

          const salesFactor = (b26['A.1'] || 0) / salesRunRate;
          const purchFactor = (Math.abs(b26['A.4'] || 0)) / purchRunRate;

          // Scale Operative Accounts
          if (estimatedAccounts['1.B.III']) estimatedAccounts['1.B.III'] *= salesFactor; // Clients
          if (estimatedAccounts['2.C.V.1']) estimatedAccounts['2.C.V.1'] *= purchFactor; // Providers
          if (estimatedAccounts['1.B.II']) estimatedAccounts['1.B.II'] *= purchFactor; // Inventory
        }
      }

      // 4. Final Totals Recalculation
      if (isBalance) {
        estimatedAccounts['1.B'] = (estimatedAccounts['1.B.I'] || 0) + (estimatedAccounts['1.B.II'] || 0) + 
                                   (estimatedAccounts['1.B.III'] || 0) + (estimatedAccounts['1.B.IV'] || 0) + 
                                   (estimatedAccounts['1.B.V'] || 0) + (estimatedAccounts['1.B.VI'] || 0) + 
                                   (estimatedAccounts['1.B.VII'] || 0);
        
        estimatedAccounts['1.TOT'] = (estimatedAccounts['1.A'] || 0) + (estimatedAccounts['1.B'] || 0);
        estimatedAccounts['2.TOT'] = (estimatedAccounts['2.A'] || 0) + (estimatedAccounts['2.B'] || 0) + (estimatedAccounts['2.C'] || 0);
      } else {
        const sales = estimatedAccounts['A.1'] || 0;
        const cogs = Math.abs(estimatedAccounts['A.4'] || 0);
        const labor = Math.abs(estimatedAccounts['A.6'] || 0);
        const opex = Math.abs(estimatedAccounts['A.7'] || 0);
        const amort = Math.abs(estimatedAccounts['A.8'] || 0);

        estimatedAccounts['A.1.TOT'] = sales - cogs - labor - opex - amort;

        const finInc = estimatedAccounts['A.12'] || 0;
        const finExp = Math.abs(estimatedAccounts['A.13'] || 0);
        const ebt = estimatedAccounts['A.1.TOT'] + finInc - finExp;
        const taxes = ebt > 0 ? ebt * 0.25 : 0;
        estimatedAccounts['A.5.TOT'] = ebt - taxes;
      }

      return {
        year,
        isEstimate,
        ...estimatedAccounts,
      };
    })
    .sort((a, b) => b.year - a.year)
    .slice(0, 4);
};

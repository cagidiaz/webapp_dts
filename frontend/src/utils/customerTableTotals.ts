import type { CustomerDataRow } from '../api/customers';
import { getCustomerGeoLocation, isInternationalCustomer, type GeoZone } from './geoCoordinates';

// Use the complete, already filtered map portfolio, never the loaded table pages.
export function getCustomerTableTotals(customers: CustomerDataRow[], zone: GeoZone | null) {
  const totals = { count: 0, sales_2023: 0, sales_2024: 0, sales_2025: 0, sales_2026: 0, total: 0 };
  for (const customer of customers) {
    if (customer.client_id?.startsWith('999999')) continue;
    if (zone && (zone.id === 'INTL'
      ? !isInternationalCustomer(customer)
      : getCustomerGeoLocation(customer)?.id !== zone.id)) continue;
    const y2023 = Number(customer.sales_2023) || 0;
    const y2024 = Number(customer.sales_2024) || 0;
    const y2025 = Number(customer.sales_2025) || 0;
    const y2026 = Number(customer.sales_2026_ytd) || Number(customer.total_sales) || 0;
    totals.count++;
    totals.sales_2023 += y2023;
    totals.sales_2024 += y2024;
    totals.sales_2025 += y2025;
    totals.sales_2026 += y2026;
    totals.total += Number(customer.sales_total) || (y2023 + y2024 + y2025 + y2026);
  }
  return totals;
}

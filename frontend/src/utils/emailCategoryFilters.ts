interface CategorizedEmail {
  quoteDocumentNo?: string | null;
  parsedEmail: { categoryKey: string };
}

/** Counts describe the quote scope before narrowing by the selected category. */
export function filterEmailCategories<T extends CategorizedEmail>(emails: T[], quoteFilter: string, categoryFilter: string) {
  const quoteEmails = emails.filter(mail => {
    if (quoteFilter === 'ALL') return true;
    if (quoteFilter === 'WITH_QUOTE') return !!mail.quoteDocumentNo;
    if (quoteFilter === 'WITHOUT_QUOTE') return !mail.quoteDocumentNo;
    return mail.quoteDocumentNo === quoteFilter;
  });
  const categoryCounts: Record<string, number> = {
    ALL: quoteEmails.length, PETICION_OFERTA: 0, OFERTA_PROVEEDOR: 0,
    REVISION_OFERTA: 0, NEGOCIACION: 0, CIERRE_ACEPTACION: 0,
  };
  for (const mail of quoteEmails) {
    const key = mail.parsedEmail.categoryKey;
    if (key !== 'ALL' && Object.hasOwn(categoryCounts, key)) categoryCounts[key]++;
  }
  return { categoryCounts, filteredEmailsList: categoryFilter === 'ALL'
    ? quoteEmails : quoteEmails.filter(mail => mail.parsedEmail.categoryKey === categoryFilter) };
}

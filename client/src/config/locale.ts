const currencyCode = import.meta.env.VITE_CURRENCY?.trim() || "UGX";
const locale = import.meta.env.VITE_LOCALE?.trim() || "en-UG";

let currencyFormatter: Intl.NumberFormat | undefined;

export function formatCurrency(amount: number): string {
  currencyFormatter ??= new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  });
  return currencyFormatter.format(amount);
}

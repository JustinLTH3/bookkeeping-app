const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "exceptZero",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

-- @param {String} $1:userId
-- @param {DateTime} $2:periodStart
SELECT
  COALESCE(SUM(amount), 0) AS net_balance,
  COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND amount > 0), 0) AS period_income,
  COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND amount < 0), 0) AS period_expense,
  COALESCE(SUM(amount) FILTER (WHERE date >= $2), 0) AS period_net_flow
FROM "Transaction"
WHERE "userId" = $1;

-- @param {String} $1:userId
-- @param {DateTime} $2:weekStart
-- @param {DateTime} $3:periodStart
SELECT
  COALESCE(SUM(amount), 0) AS net_balance,
  COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND amount > 0), 0) AS week_income,
  COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND amount < 0), 0) AS week_expense,
  COALESCE(SUM(amount) FILTER (WHERE date >= $3), 0) AS period_net_flow
FROM "Transaction"
WHERE "userId" = $1;

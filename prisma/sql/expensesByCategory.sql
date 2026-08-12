-- @param {String} $1:userId
-- @param {DateTime} $2:startDate
SELECT c.name AS name, SUM(t.amount) AS total
FROM "Transaction" t
INNER JOIN "Category" c ON c.id = t."categoryId"
WHERE t."userId" = $1
  AND t.date >= $2
  AND t.amount < 0
GROUP BY c.name
ORDER BY total ASC;

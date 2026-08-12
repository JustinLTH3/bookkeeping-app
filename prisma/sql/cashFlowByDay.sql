-- @param {String} $1:userId
-- @param {DateTime} $2:startDate
SELECT date AS day, SUM(amount) AS total
FROM "Transaction"
WHERE "userId" = $1 AND date >= $2
GROUP BY date;

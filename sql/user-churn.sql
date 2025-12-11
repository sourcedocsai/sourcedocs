-- Churned users
SELECT username, email, upgraded_at, canceled_at
FROM users
WHERE canceled_at IS NOT NULL
ORDER BY canceled_at DESC;

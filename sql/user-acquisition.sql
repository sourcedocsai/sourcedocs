-- New users per day/week/month
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_users
FROM users
GROUP BY date
ORDER BY date DESC;

-- Total users
SELECT COUNT(*) as total_users FROM users;

-- Pro conversion rate
SELECT 
  COUNT(*) FILTER (WHERE is_pro = true) as pro_users,
  COUNT(*) as total_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_pro = true) / COUNT(*), 2) as conversion_rate
FROM users;

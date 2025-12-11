-- Most popular doc types
SELECT 
  doc_type, 
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM generations
GROUP BY doc_type
ORDER BY count DESC;

-- Generations per day
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as generations
FROM generations
GROUP BY date
ORDER BY date DESC;

-- Average generations per user
SELECT 
  ROUND(AVG(gen_count), 2) as avg_generations_per_user
FROM (
  SELECT user_id, COUNT(*) as gen_count
  FROM generations
  GROUP BY user_id
) sub;

-- Power users (most generations)
SELECT 
  u.username,
  u.email,
  u.is_pro,
  COUNT(g.id) as total_generations
FROM users u
JOIN generations g ON u.id = g.user_id
GROUP BY u.id, u.username, u.email, u.is_pro
ORDER BY total_generations DESC
LIMIT 20;

-- Most documented repos
SELECT 
  repo_url,
  COUNT(*) as times_documented
FROM generations
GROUP BY repo_url
ORDER BY times_documented DESC
LIMIT 20;

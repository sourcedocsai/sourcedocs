-- Users who hit limit but didn't upgrade
SELECT 
  u.username,
  u.email,
  COUNT(g.id) as generations,
  u.survey_completed
FROM users u
JOIN generations g ON u.id = g.user_id
WHERE u.is_pro = false
GROUP BY u.id, u.username, u.email, u.survey_completed
HAVING COUNT(g.id) >= 1
ORDER BY generations DESC;

-- Users who completed survey but didn't upgrade
SELECT 
  u.username,
  u.email,
  sr.would_pay,
  sr.feedback
FROM users u
JOIN survey_responses sr ON u.id = sr.user_id
WHERE u.is_pro = false
ORDER BY sr.created_at DESC;

-- Daily/Weekly active users
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(DISTINCT user_id) as active_users
FROM generations
GROUP BY week
ORDER BY week DESC;

-- Churn risk (Pro users with no recent activity)
SELECT 
  u.username,
  u.email,
  MAX(g.created_at) as last_generation,
  NOW() - MAX(g.created_at) as days_since_last_use
FROM users u
LEFT JOIN generations g ON u.id = g.user_id
WHERE u.is_pro = true
GROUP BY u.id, u.username, u.email
HAVING MAX(g.created_at) < NOW() - INTERVAL '30 days'
   OR MAX(g.created_at) IS NULL;

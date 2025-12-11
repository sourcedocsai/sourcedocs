i-- Monthly Recurring Revenue (MRR)
SELECT 
  COUNT(*) * 8 as mrr_dollars
FROM users
WHERE is_pro = true;

-- Conversion funnel
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE id IN (SELECT DISTINCT user_id FROM generations)) as users_who_generated,
  COUNT(*) FILTER (WHERE is_pro = true) as pro_users
FROM users;

-- Time to conversion (signup to pro)
SELECT 
  u.username,
  u.created_at as signup_date,
  MIN(g.created_at) as first_generation,
  -- Would need stripe webhook timestamp for actual upgrade date
  u.is_pro
FROM users u
LEFT JOIN generations g ON u.id = g.user_id
WHERE u.is_pro = true
GROUP BY u.id, u.username, u.created_at, u.is_pro;

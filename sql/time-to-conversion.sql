-- Time to conversion (signup → upgrade)
SELECT 
  username,
  created_at as signup,
  upgraded_at as upgrade,
  EXTRACT(DAY FROM upgraded_at - created_at) as days_to_convert
FROM users
WHERE upgraded_at IS NOT NULL
ORDER BY days_to_convert;

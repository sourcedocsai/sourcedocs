-- Referral sources (once tracked)
SELECT 
  referral_source,
  COUNT(*) as users,
  COUNT(*) FILTER (WHERE is_pro = true) as converted
FROM users
WHERE referral_source IS NOT NULL
GROUP BY referral_source
ORDER BY users DESC;

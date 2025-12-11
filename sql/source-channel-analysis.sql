-- Generations by source
SELECT 
  source,
  COUNT(*) as count
FROM generations
GROUP BY source
ORDER BY count DESC;

-- API key usage
SELECT 
  ak.name,
  u.username,
  ak.last_used_at,
  COUNT(g.id) as generations
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
LEFT JOIN generations g ON g.api_key_id = ak.id
GROUP BY ak.id, ak.name, u.username, ak.last_used_at
ORDER BY generations DESC;

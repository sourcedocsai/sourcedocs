-- Average generation time by doc type
SELECT 
  doc_type,
  ROUND(AVG(generation_time_ms)) as avg_ms,
  ROUND(AVG(generation_time_ms) / 1000.0, 2) as avg_seconds
FROM generations
WHERE generation_time_ms IS NOT NULL
GROUP BY doc_type
ORDER BY avg_ms DESC;

-- Role distribution
SELECT 
  role, 
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM survey_responses
GROUP BY role
ORDER BY count DESC;

-- Team size distribution
SELECT 
  team_size, 
  COUNT(*) as count
FROM survey_responses
GROUP BY team_size
ORDER BY count DESC;

-- Willingness to pay
SELECT 
  would_pay, 
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM survey_responses
GROUP BY would_pay
ORDER BY count DESC;

-- Most requested doc types
SELECT 
  UNNEST(important_docs) as doc_type,
  COUNT(*) as votes
FROM survey_responses
GROUP BY doc_type
ORDER BY votes DESC;

-- Doc frequency vs willingness to pay
SELECT 
  doc_frequency,
  would_pay,
  COUNT(*) as count
FROM survey_responses
GROUP BY doc_frequency, would_pay
ORDER BY doc_frequency, would_pay;

-- Feedback themes (manual review)
SELECT feedback 
FROM survey_responses 
WHERE feedback IS NOT NULL AND feedback != ''
ORDER BY created_at DESC;

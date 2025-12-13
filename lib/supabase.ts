import { createClient } from '@supabase/supabase-js';

// Supabase Admin client for server-side operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Plan types
export type Plan = 'free' | 'web_pro' | 'api_pro' | 'bundle';

// User interface matching the database schema
export interface User {
  id: string;
  github_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_pro: boolean;
  is_admin: boolean;
  survey_completed: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  upgraded_at: string | null;
  canceled_at: string | null;
  referral_source: string | null;
  plan: Plan;
  api_key: string | null;
  api_calls_limit: number;
  api_calls_used: number;
  api_calls_reset_at: string;
  web_generations_used: number;
  web_generations_reset_at: string;
  github_access_token: string | null;
  created_at: string;
}

// Generation record interface
export interface Generation {
  id: string;
  user_id: string;
  doc_type: string;
  repo_url: string;
  source: 'web' | 'api';
  generation_time_ms: number | null;
  created_at: string;
}

// Survey response interface
export interface SurveyResponse {
  id: string;
  user_id: string;
  would_pay: string;
  max_price: string | null;
  use_case: string | null;
  feedback: string | null;
  created_at: string;
}

// API Key interface
export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  last_used_at: string | null;
  created_at: string;
}

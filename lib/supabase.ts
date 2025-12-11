import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type Plan = 'free' | 'web_pro' | 'api_pro' | 'bundle';

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
  api_calls_limit: number;
  api_calls_used: number;
  api_calls_reset_at: string;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  doc_type: string;
  repo_url: string;
  source: string;
  generation_time_ms: number | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

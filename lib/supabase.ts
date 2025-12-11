import { createClient } from '@supabase/supabase-js';

// Server-side client (with service role for admin access)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface User {
  id: string;
  github_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_pro: boolean;
  survey_completed: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
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

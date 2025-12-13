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
  github_access_token: string | null;  // Add this line
  created_at: string;
}

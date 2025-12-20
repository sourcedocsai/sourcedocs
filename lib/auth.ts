import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { getOrCreateUser, updateUserGithubToken } from './db';

// Validate required environment variables at startup
const requiredEnvVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Extend NextAuth types for custom session properties
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubId: string;
      username: string;
      userId: string;
      isPro: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    githubId?: string;
    username?: string;
    userId?: string;
    isPro?: boolean;
  }
}

interface GitHubProfile {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request repo scope for PR creation functionality
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const ghProfile = profile as GitHubProfile;

        // Save/get user from database
        const user = await getOrCreateUser({
          id: String(ghProfile.id),
          login: ghProfile.login,
          name: ghProfile.name,
          email: ghProfile.email,
          avatar_url: ghProfile.avatar_url,
        });

        // Store the GitHub access token for API calls (PR creation)
        if (account.access_token) {
          await updateUserGithubToken(user.id, account.access_token);
        }

        token.githubId = String(ghProfile.id);
        token.username = ghProfile.login;
        token.userId = user.id;
        token.isPro = user.is_pro;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.githubId = token.githubId as string;
        session.user.username = token.username as string;
        session.user.userId = token.userId as string;
        session.user.isPro = token.isPro as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

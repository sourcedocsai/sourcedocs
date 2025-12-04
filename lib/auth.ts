import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { getOrCreateUser } from './db';

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
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const ghProfile = profile as GitHubProfile;
        
        // Save/get user from database
        const user = await getOrCreateUser({
          githubId: String(ghProfile.id),
          email: ghProfile.email,
          name: ghProfile.name,
          avatar_url: ghProfile.avatar_url,
          username: ghProfile.login,
        });

        token.githubId = String(ghProfile.id);
        token.username = ghProfile.login;
        token.userId = user.id; // Supabase user ID
        token.isPro = user.is_pro;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubId = token.githubId;
        (session.user as any).username = token.username;
        (session.user as any).userId = token.userId;
        (session.user as any).isPro = token.isPro;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

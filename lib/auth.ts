import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { getOrCreateUser, updateUserGithubToken } from './db';

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
          // Request repo scope for PR creation
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
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubId = token.githubId;
        (session.user as any).username = token.username;
        (session.user as any).userId = token.userId;
        (session.user as any).isPro = token.isPro;
        // Don't expose access token to client - keep it server-side only
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

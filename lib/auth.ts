import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

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
      // First login - save GitHub data
      if (account && profile) {
        const ghProfile = profile as GitHubProfile;
        token.githubId = ghProfile.id;
        token.username = ghProfile.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose to client
      if (session.user) {
        (session.user as any).githubId = token.githubId;
        (session.user as any).username = token.username;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};

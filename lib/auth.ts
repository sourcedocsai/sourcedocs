import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

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
        token.githubId = profile.id;
        token.username = (profile as any).login;
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
    signIn: '/', // Redirect to home, we'll handle login there
  },
};

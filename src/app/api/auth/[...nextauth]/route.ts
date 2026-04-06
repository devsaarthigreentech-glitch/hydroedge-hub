import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const result = await pool.query(
          `SELECT id, username, email, full_name, password_hash, role, customer_id
           FROM users
           WHERE (username = $1 OR email = $1)
             AND status = 'active'
             AND deleted_at IS NULL`,
          [credentials.username]
        );

        const user = result.rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.full_name || user.username,
          email: user.email,
          role: user.role,
          customerId: user.customer_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.customerId = (user as any).customerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).customerId = token.customerId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
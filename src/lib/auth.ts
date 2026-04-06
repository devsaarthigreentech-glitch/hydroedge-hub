// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "./db";

export const authOptions: NextAuthOptions = {
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
          `SELECT u.id, u.username, u.email, u.full_name, u.password_hash, 
                  u.role, u.customer_id, u.is_active,
                  c.name AS customer_name, c.hierarchy_level, 
                  c.parent_customer_id, c.hide_from_grandparent
           FROM users u
           LEFT JOIN customers c ON c.id = u.customer_id
           WHERE (u.username = $1 OR u.email = $1)
             AND u.is_active = TRUE
             AND u.deleted_at IS NULL`,
          [credentials.username]
        );

        const user = result.rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        // Update last login
        await pool.query(
          `UPDATE users SET last_login_at = NOW(), last_login_ip = $2 WHERE id = $1`,
          [user.id, null]
        );

        return {
          id: user.id,
          name: user.full_name || user.username,
          email: user.email,
          role: user.role,
          customerId: user.customer_id,
          customerName: user.customer_name,
          hierarchyLevel: user.hierarchy_level ?? 0,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.customerId = (user as any).customerId;
        token.customerName = (user as any).customerName;
        token.hierarchyLevel = (user as any).hierarchyLevel;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).customerId = token.customerId;
        (session.user as any).customerName = token.customerName;
        (session.user as any).hierarchyLevel = token.hierarchyLevel;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
};

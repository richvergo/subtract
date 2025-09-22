import { AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      memberships: Array<{
        id: string;
        role: string;
        entity: {
          id: string;
          name: string;
        };
      }>;
      activeEntityId?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    memberships: Array<{
      id: string;
      role: string;
      entity: {
        id: string;
        name: string;
      };
    }>;
    activeEntityId?: string;
  }
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: '/api/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.memberships = user.memberships;
        token.activeEntityId = user.activeEntityId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.memberships = token.memberships as Array<{
          id: string;
          role: string;
          entity: {
            id: string;
            name: string;
          };
        }>;
        session.user.activeEntityId = token.activeEntityId as string | undefined;
      }
      return session;
    }
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ 
          where: { email },
          include: {
            memberships: {
              include: {
                entity: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
        if (!user) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        // Set the first entity as active by default
        const activeEntityId = user.memberships.length > 0 
          ? user.memberships[0].entity.id 
          : undefined;

        return { 
          id: user.id, 
          email: user.email, 
          name: user.name || "",
          memberships: user.memberships.map((m: { id: string; role: string; entity: { id: string; name: string } }) => ({
            id: m.id,
            role: m.role,
            entity: m.entity,
          })),
          activeEntityId,
        };
      }
    })
  ]
};

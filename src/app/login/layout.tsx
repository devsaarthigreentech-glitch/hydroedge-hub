// src/app/login/layout.tsx
import SessionProvider from "@/app/login/SessionProvider";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}

import SessionProvider from "@/app/login/SessionProvider";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
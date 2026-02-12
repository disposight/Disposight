import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your DispoSight account to access corporate distress intelligence and your deal pipeline.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

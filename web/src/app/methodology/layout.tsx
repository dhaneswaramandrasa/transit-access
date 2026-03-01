import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Transit Accessibility Index",
  description:
    "How the transit equity scoring and quadrant classification work for Jabodetabek.",
};

export default function MethodologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

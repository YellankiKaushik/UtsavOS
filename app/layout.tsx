import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "UtsavOS — Make room for the celebration",
    template: "%s · UtsavOS",
  },
  description:
    "Thoughtful event planning. Clear budgets, connected tasks, and changes you can trust.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

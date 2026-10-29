import { Brand } from "@/components/brand";
import { RsvpPortal } from "@/components/rsvp";
export const metadata = {
  title: "Your invitation",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <main id="main" style={{ maxWidth: 680, padding: 24, margin: "32px auto" }}>
      <Brand />
      <RsvpPortal />
    </main>
  );
}

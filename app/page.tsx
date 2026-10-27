import Link from "next/link";
import {
  ArrowRight,
  Flower2,
  Check,
  GitBranch,
  Coins,
  ListChecks,
} from "lucide-react";
import { Brand } from "@/components/brand";
export default function Landing() {
  return (
    <>
      <header className="public-nav">
        <Brand />
        <Link className="button primary" href="/login">
          Start planning <ArrowRight size={16} />
        </Link>
      </header>
      <main id="main" className="landing">
        <section className="landing-hero">
          <div>
            <span className="badge">
              For the moments that bring us together
            </span>
            <h1>
              Less coordinating.
              <br />
              <em>More celebrating.</em>
            </h1>
            <p className="lead">
              A thoughtful home for your wedding, birthday, or community
              celebration. Bring the details together. Make changes with
              confidence.
            </p>
            <div className="actions">
              <Link className="button primary" href="/login">
                Plan your celebration <ArrowRight size={16} />
              </Link>
              <span className="muted" style={{ fontSize: 12 }}>
                Your plan. Your final say.
              </span>
            </div>
          </div>
          <div
            className="landing-art"
            aria-label="An original botanical celebration illustration"
          >
            <Flower2 size={200} strokeWidth={0.7} />
            <div className="floating">
              <div className="row-between">
                <span className="badge">
                  <GitBranch size={12} /> Changes, considered.
                </span>
                <Check size={18} />
              </div>
              <h3 style={{ margin: "15px 0 5px" }}>
                A few more guests? See the whole picture.
              </h3>
              <small>
                Review costs and connected tasks before you approve.
              </small>
            </div>
          </div>
        </section>
        <section className="landing-features grid three">
          {[
            {
              icon: Coins,
              title: "Every rupee accounted for",
              text: "Clear estimates, exact calculations, and a budget that moves with your guest list.",
            },
            {
              icon: ListChecks,
              title: "The details, all together",
              text: "Keep tasks, timelines, and supplier requirements connected to one saved event.",
            },
            {
              icon: GitBranch,
              title: "Thoughtful help. Real control.",
              text: "Review Gemini planning drafts and inspect proposed changes before they become your plan.",
            },
          ].map((f, i) => (
            <article key={f.title}>
              <div className="feature-no">0{i + 1}</div>
              <f.icon size={22} />
              <h2 style={{ margin: "18px 0 12px" }}>{f.title}</h2>
              <p className="muted">{f.text}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-footer row-between">
        <span>UtsavOS · Space for every celebration.</span>
        <span>
          Planning estimates require your confirmation. No booking or payment
          service.
        </span>
      </footer>
    </>
  );
}

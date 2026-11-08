import { useState } from "react";
import { Icon, type IconName } from "./icons";
import {
  budgetSummary,
  formatRupees,
  fresh,
  loadPlan,
  savePlan,
  scenario,
  taskProgress,
  type EventType,
  type Plan,
} from "./model";
import {
  Budget,
  Draft,
  EventSetup,
  Overview,
  plannerSections,
  Replan,
  Tasks,
  type Section,
} from "./Planner";

const repository = "https://github.com/YellankiKaushik/UtsavOS";
const setup = `${repository}/blob/main/docs/SETUP.md`;
const architecture = `${repository}/blob/main/docs/ARCHITECTURE.md`;
const walkthrough = "https://www.youtube.com/watch?v=Z5bo9ydn7JE";

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="UtsavOS home">
      <span className="brand-mark">
        <Icon name="sparkle" />
      </span>
      <span>
        Utsav<span className="brand-accent">OS</span>
      </span>
    </a>
  );
}

function Preview() {
  const sample = scenario();
  const budget = budgetSummary(sample);
  const tasks = taskProgress(sample);
  const share = Math.min(budget.allocatedPercent ?? 0, 100);

  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-grid" />
      <div className="art-orbit art-orbit-one" />
      <div className="art-orbit art-orbit-two" />
      <div className="art-spark art-spark-top">✦</div>
      <div className="art-spark art-spark-bottom">✧</div>
      <div className="art-caption">
        <span>01</span> THE PLANNING DESK
      </div>
      <div className="preview-card">
        <div className="preview-window">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>Sample workspace</span>
        </div>
        <div className="preview-content">
          <div className="preview-heading">
            <div>
              <small>EVENT OVERVIEW</small>
              <strong>{sample.event.name}</strong>
            </div>
            <span className="preview-tag">Planning</span>
          </div>
          <div className="preview-metrics">
            <div>
              <span>Expected guests</span>
              <strong>{sample.event.guests}</strong>
            </div>
            <div>
              <span>Tasks complete</span>
              <strong>
                {tasks.completed}
                <small> / {tasks.total}</small>
              </strong>
            </div>
          </div>
          <div className="preview-budget">
            <div>
              <small>BUDGET REMAINING</small>
              <strong>{formatRupees(budget.remainingPaise)}</strong>
              <span>After planned allocations</span>
            </div>
            <svg viewBox="0 0 100 100" width="86" height="86" focusable="false">
              <circle
                cx="50"
                cy="50"
                r="39"
                fill="none"
                stroke="#e4e9de"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="39"
                fill="none"
                stroke="#477353"
                strokeWidth="10"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${share} 100`}
                transform="rotate(-90 50 50)"
              />
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fontSize="15"
                fontWeight="700"
                fill="#213d32"
              >
                {Math.round(share)}%
              </text>
            </svg>
          </div>
          <div className="preview-next">
            <span className="preview-next-icon">
              <Icon name="check" />
            </span>
            <span>
              <small>UP NEXT</small>
              <strong>{tasks.upcoming[0]?.title}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="art-footer">
        <span>✳</span> Every detail, in its place.
      </div>
    </div>
  );
}

const features: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "budget",
    title: "Budgets that add up",
    body: "Separate fixed and per-guest costs. See exactly how much of your budget is allocated and what’s left.",
  },
  {
    icon: "tasks",
    title: "A clear next step",
    body: "Edit tasks, set priorities, and track the prerequisites that need attention before a task is complete.",
  },
  {
    icon: "replan",
    title: "Room for plans to change",
    body: "Compare the before and after when guest counts or budgets shift. Apply the changes when you’re ready.",
  },
];

function Landing() {
  return (
    <>
      <section className="hero content-width" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-dot" /> THE EVENT PLANNING WORKSPACE
          </p>
          <h1 id="hero-title">
            Good celebrations
            <br className="hero-break" /> start with <em>a plan.</em>
          </h1>
          <p className="hero-description">
            Bring event details, budgets, and timelines together. Then see what
            changes when the guest list grows or the budget shifts.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-hero" href="#demo">
              Explore Interactive Demo <Icon name="arrow" />
            </a>
            <a
              className="button button-secondary button-hero"
              href={walkthrough}
            >
              <Icon name="play" /> Watch walkthrough
            </a>
          </div>
          <p className="hero-note">
            <Icon name="check" /> Synthetic scenarios <span>·</span> Plans saved
            in this browser
          </p>
        </div>
        <Preview />
      </section>

      <section
        className="features"
        id="features"
        tabIndex={-1}
        aria-labelledby="features-title"
      >
        <div className="content-width">
          <header className="features-header">
            <p className="eyebrow">BUILT FOR THE DETAILS</p>
            <h2 id="features-title">
              A practical plan, from first idea to event day.
            </h2>
          </header>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Workspace() {
  const [initial] = useState(() => loadPlan());
  const [plan, setPlan] = useState(initial.plan);
  const [warning, setWarning] = useState(initial.warning);
  const [section, setSection] = useState<Section>("Overview");
  const [generation, setGeneration] = useState(0);
  const [pendingReplacement, setPendingReplacement] = useState<
    "reset" | "fresh"
  >();
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  }>();

  function persist(next: Plan) {
    setPlan(next);
    setWarning(
      savePlan(next)
        ? null
        : "Browser storage is unavailable. Changes may be lost when you close or reload this tab.",
    );
  }

  function commit(change: (current: Plan) => Plan, message: string) {
    try {
      persist(change(plan));
      setFeedback({ message, error: false });
      return true;
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Check the values and try again.",
        error: true,
      });
      return false;
    }
  }

  function navigate(next: Section) {
    setSection(next);
    setFeedback(undefined);
  }

  function replace(next: Plan, destination: Section, message: string) {
    persist(next);
    setGeneration((value) => value + 1);
    setSection(destination);
    setPendingReplacement(undefined);
    setFeedback({ message, error: false });
  }

  function openScenario(type: EventType) {
    replace(scenario(type), "Overview", "Sample scenario loaded.");
  }

  function confirmReplacement() {
    if (pendingReplacement === "reset") {
      replace(scenario(), "Overview", "Wedding sample restored.");
    } else {
      replace(
        fresh(plan.event.type),
        "Event setup",
        "Fresh plan started. Set your event details to begin.",
      );
    }
  }

  return (
    <section
      className="demo content-width"
      id="demo"
      tabIndex={-1}
      aria-labelledby="demo-title"
    >
      <div className="demo-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> INTERACTIVE SHOWCASE
          </p>
          <h2 id="demo-title">Make the plan yours.</h2>
          <p>
            Start with an invented wedding, birthday, or community gathering.
            Change anything and see the numbers respond.
          </p>
        </div>
        <span className="local-badge">
          <span /> BROWSER-LOCAL DEMO
        </span>
      </div>
      <div className="workspace">
        <div className="workspace-top">
          <div>
            <span className="workspace-kicker">YOUR WORKSPACE</span>
            <p>{plan.event.name || "Untitled celebration"}</p>
          </div>
          <div className="workspace-actions">
            <button
              className="button button-secondary button-small"
              onClick={() => setPendingReplacement("reset")}
            >
              Reset sample
            </button>
            <button
              className="button button-secondary button-small"
              onClick={() => setPendingReplacement("fresh")}
            >
              Start fresh
            </button>
          </div>
        </div>
        {pendingReplacement && (
          <div
            className="confirm-plan"
            role="group"
            aria-label="Confirm plan replacement"
          >
            <p>
              {pendingReplacement === "reset"
                ? "Replace your current plan with the original wedding sample?"
                : "Replace your current plan with a blank event?"}
            </p>
            <div className="form-actions">
              <button
                className="button button-primary button-small"
                onClick={confirmReplacement}
              >
                {pendingReplacement === "reset"
                  ? "Reset to sample"
                  : "Create fresh plan"}
              </button>
              <button
                className="button button-secondary button-small"
                onClick={() => setPendingReplacement(undefined)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="workspace-body">
          <nav className="planner-nav" aria-label="Planner sections">
            <p className="workspace-kicker">PLANNING TOOLS</p>
            {plannerSections.map((item) => (
              <button
                key={item.name}
                aria-pressed={section === item.name}
                onClick={() => navigate(item.name)}
              >
                <Icon name={item.icon} /> {item.name}
              </button>
            ))}
          </nav>
          <div className="workspace-panel">
            {warning && (
              <p className="inline-alert" role="status">
                {warning}
              </p>
            )}
            {feedback && (
              <p
                className={feedback.error ? "inline-alert" : "inline-success"}
                role={feedback.error ? "alert" : "status"}
              >
                {feedback.message}
              </p>
            )}
            {section === "Overview" && (
              <Overview plan={plan} navigate={navigate} />
            )}
            {section === "Event setup" && (
              <EventSetup
                key={generation}
                plan={plan}
                commit={commit}
                onScenario={openScenario}
              />
            )}
            {section === "Budget" && (
              <Budget key={generation} plan={plan} commit={commit} />
            )}
            {section === "Tasks" && (
              <Tasks key={generation} plan={plan} commit={commit} />
            )}
            {section === "Replan" && (
              <Replan key={generation} plan={plan} commit={commit} />
            )}
            {section === "Sample draft" && (
              <Draft key={generation} plan={plan} commit={commit} />
            )}
          </div>
        </div>
        <p className="workspace-privacy">
          Your demo plan lives in this browser. It is neither synchronized nor
          backed up.
        </p>
      </div>
    </section>
  );
}

function UnderTheHood() {
  return (
    <section
      className="technical"
      id="under-the-hood"
      tabIndex={-1}
      aria-labelledby="technical-title"
    >
      <div className="technical-content content-width">
        <div>
          <p className="eyebrow">BEHIND THE SHOWCASE</p>
          <h2 id="technical-title">A small demo of a larger idea.</h2>
          <p>
            UtsavOS began as a PromptWars Challenge 5 project. The repository
            includes the original Next.js planner and a separate static
            showcase.
          </p>
          <a className="button button-light" href={architecture}>
            Read the architecture <Icon name="external" />
          </a>
        </div>
        <div className="technical-cards">
          <article>
            <span className="technical-index">01 / STATIC SHOWCASE</span>
            <h3>Runs in your browser</h3>
            <p>
              Event edits, exact budget calculations, task dependencies,
              deterministic replanning, and bundled draft suggestions use
              synthetic data and browser storage.
            </p>
          </article>
          <article>
            <span className="technical-index">02 / SOURCE APPLICATION</span>
            <h3>Self-host with your services</h3>
            <p>
              Authentication, collaboration, shared persistence, authorized
              RSVPs, private documents, transactional audit records, and
              optional live AI are features of the separate application.
            </p>
            <a className="technical-link" href={setup}>
              Open the setup guide <Icon name="external" />
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header" id="top">
        <div className="content-width site-header-inner">
          <Brand />
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a href="#under-the-hood">Architecture</a>
          </nav>
          <a
            className="header-source"
            href={repository}
            aria-label="GitHub source"
          >
            <Icon name="code" /> <span>GitHub source</span>
            <Icon name="external" />
          </a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Landing />
        <Workspace />
        <UnderTheHood />
      </main>
      <footer className="site-footer">
        <div className="content-width footer-inner">
          <Brand />
          <p>A plan for every celebration.</p>
          <a href={repository}>
            View the source <Icon name="external" />
          </a>
        </div>
      </footer>
    </>
  );
}

import type { BudgetCategory, EventType, Plan, Task } from "./model";

type Fixture = Pick<Plan, "event" | "categories" | "tasks">;

export const fixtures: Record<EventType, Fixture> = {
  wedding: {
    event: {
      type: "wedding",
      name: "The Marigold Wedding",
      date: "2027-02-14",
      guests: 120,
      budgetPaise: 90_000_000,
      preferences: "A courtyard celebration with a seasonal vegetarian menu.",
    },
    categories: [
      { id: "venue", name: "Venue", basis: "fixed", amountPaise: 28_000_000 },
      {
        id: "catering",
        name: "Catering",
        basis: "per_guest",
        amountPaise: 170_000,
      },
      { id: "decor", name: "Decor", basis: "fixed", amountPaise: 12_500_000 },
      {
        id: "photography",
        name: "Photography",
        basis: "fixed",
        amountPaise: 9_500_000,
      },
    ],
    tasks: [
      task("venue", "Confirm venue layout", "2027-01-10", "high", [], true),
      task("menu", "Finalize the menu", "2027-01-17", "high", ["venue"]),
      task("photo", "Brief the photography team", "2027-01-24", "normal", [
        "venue",
      ]),
      task("diet", "Confirm dietary counts", "2027-02-07", "normal", ["menu"]),
    ],
  },
  birthday: {
    event: {
      type: "birthday",
      name: "Paper Lantern Birthday",
      date: "2027-03-20",
      guests: 36,
      budgetPaise: 7_500_000,
      preferences: "An afternoon party with craft stations and a quiet corner.",
    },
    categories: [
      { id: "venue", name: "Venue", basis: "fixed", amountPaise: 1_800_000 },
      { id: "food", name: "Snacks", basis: "per_guest", amountPaise: 62_500 },
      {
        id: "activities",
        name: "Activities",
        basis: "fixed",
        amountPaise: 1_450_000,
      },
    ],
    tasks: [
      task("room", "Set the room layout", "2027-02-20", "high", [], true),
      task("craft", "Plan the craft stations", "2027-03-03", "high", ["room"]),
      task("snacks", "Choose the snack menu", "2027-03-08", "normal", ["room"]),
      task("bags", "Pack activity kits", "2027-03-17", "low", ["craft"]),
    ],
  },
  community: {
    event: {
      type: "community",
      name: "Courtyard Community Day",
      date: "2027-04-10",
      guests: 180,
      budgetPaise: 16_000_000,
      preferences:
        "A neighborhood gathering with step-free routes and covered seating.",
    },
    categories: [
      {
        id: "space",
        name: "Space hire",
        basis: "fixed",
        amountPaise: 4_200_000,
      },
      {
        id: "meals",
        name: "Shared lunch",
        basis: "per_guest",
        amountPaise: 37_500,
      },
      { id: "signs", name: "Signage", basis: "fixed", amountPaise: 1_600_000 },
    ],
    tasks: [
      task(
        "space",
        "Walk the accessible route",
        "2027-03-01",
        "high",
        [],
        true,
      ),
      task("shifts", "Set volunteer shifts", "2027-03-13", "high", ["space"]),
      task("lunch", "Confirm lunch portions", "2027-03-21", "normal", [
        "space",
      ]),
      task("brief", "Brief the welcome team", "2027-04-03", "normal", [
        "shifts",
      ]),
    ],
  },
};

function task(
  id: string,
  title: string,
  dueDate: string,
  priority: Task["priority"],
  dependsOn: string[],
  completed = false,
): Task {
  return { id, title, dueDate, priority, dependsOn, completed };
}

type DraftSeed =
  | {
      kind: "budget";
      slug: string;
      title: string;
      description: string;
      basis: BudgetCategory["basis"];
      amountPaise: number;
    }
  | {
      kind: "task";
      slug: string;
      title: string;
      description: string;
      priority: Task["priority"];
    };

export const draftSeeds: Record<EventType, DraftSeed[]> = {
  wedding: [
    {
      kind: "budget",
      slug: "refreshments",
      title: "Welcome refreshments",
      description: "Allow for a simple welcome drink for each guest.",
      basis: "per_guest",
      amountPaise: 24_000,
    },
    {
      kind: "budget",
      slug: "wayfinding",
      title: "Wayfinding signs",
      description:
        "Set aside one amount for signs between ceremony and dining.",
      basis: "fixed",
      amountPaise: 850_000,
    },
    {
      kind: "task",
      slug: "arrivals",
      title: "Review arrival timings",
      description: "Check for overlap between guest arrivals and setup.",
      priority: "high",
    },
    {
      kind: "task",
      slug: "weather",
      title: "Walk through the rain plan",
      description: "Check the indoor route and what needs to move.",
      priority: "normal",
    },
  ],
  birthday: [
    {
      kind: "budget",
      slug: "kits",
      title: "Extra craft kits",
      description: "Allow a small materials buffer for each guest.",
      basis: "per_guest",
      amountPaise: 10_000,
    },
    {
      kind: "budget",
      slug: "labels",
      title: "Activity table labels",
      description: "Reserve a fixed amount for reusable labels.",
      basis: "fixed",
      amountPaise: 120_000,
    },
    {
      kind: "task",
      slug: "quiet",
      title: "Set up a quiet corner",
      description: "Choose a visible seat away from the main activities.",
      priority: "normal",
    },
    {
      kind: "task",
      slug: "supplies",
      title: "Count spare supplies",
      description: "Check stock before the activity tables open.",
      priority: "high",
    },
  ],
  community: [
    {
      kind: "budget",
      slug: "water",
      title: "Water station supplies",
      description: "Add a guest-linked allowance for the water stations.",
      basis: "per_guest",
      amountPaise: 7_500,
    },
    {
      kind: "budget",
      slug: "seating",
      title: "Extra covered seating",
      description: "Reserve a fixed allowance for a second seating area.",
      basis: "fixed",
      amountPaise: 800_000,
    },
    {
      kind: "task",
      slug: "routes",
      title: "Check marked entry routes",
      description: "Confirm the printed directions match the site layout.",
      priority: "high",
    },
    {
      kind: "task",
      slug: "handover",
      title: "Schedule volunteer handover",
      description: "Leave time for shift leads to share updates in person.",
      priority: "normal",
    },
  ],
};

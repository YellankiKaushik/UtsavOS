import { invariant } from "./errors";
export function assertDag(tasks: { id: string; dependencyIds: string[] }[]) {
  invariant(tasks.length <= 1000, "INVALID_INPUT");
  const graph = new Map(tasks.map((t) => [t.id, t.dependencyIds]));
  invariant(graph.size === tasks.length, "DUPLICATE_TASK");
  const done = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    invariant(graph.has(id), "UNKNOWN_DEPENDENCY");
    invariant(!visiting.has(id), "DEPENDENCY_CYCLE");
    if (done.has(id)) return;
    visiting.add(id);
    for (const parent of graph.get(id)!) visit(parent);
    visiting.delete(id);
    done.add(id);
  }
  for (const t of tasks) visit(t.id);
}

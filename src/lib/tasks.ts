import type { Task, TaskScope } from "./types";

export function inTaskScope(task: Task, scope: TaskScope): boolean {
  const kind = task.list_kind ?? "master";
  return kind === scope.kind && (scope.kind === "master" || task.planned_date === scope.date);
}

export function tasksForDay(tasks: Task[], date: string): Task[] {
  return sortTasks(tasks.filter((task) => !task.done && (
    task.list_kind === "daily"
      ? task.planned_date === date
      : Boolean(task.due_date && task.due_date <= date)
  )));
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => Number(a.done) - Number(b.done)
    || (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31")
    || b.priority - a.priority || a.position - b.position);
}

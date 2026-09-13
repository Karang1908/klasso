import { Icon } from "../icons";

export type NotifKind = "class" | "summary" | "task" | "exam" | "plan";

const ICON: Record<NotifKind, "book" | "today" | "tasks" | "pin" | "clock"> = {
  class: "book", summary: "today", task: "tasks", exam: "pin", plan: "clock",
};

/**
 * One push notification, drawn the way the phone draws it.
 *
 * The copy is the app's real notification copy, not marketing text written to
 * look like a notification: these titles and bodies are built by the same
 * templates the dispatcher sends.
 */
export function NotifCard({ kind, title, body, when }: {
  kind: NotifKind; title: string; body: string; when: string;
}) {
  return (
    <div className="notif-card glass" data-kind={kind}>
      <span className="notif-icon"><Icon name={ICON[kind]} size={17} /></span>
      <div className="notif-copy">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <span className="notif-when">{when}</span>
    </div>
  );
}

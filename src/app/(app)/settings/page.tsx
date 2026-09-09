"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { useAppearance } from "@/components/Appearance";
import { PreviewContext, useAppHref } from "@/components/AppShell";
import { Icon } from "@/components/icons";

import { Banner, Button, Card, Field, Input, Dropdown, Spinner, Slider, Toggle, cx } from "@/components/ui";
import {
  currentSubscription, detectEnvironment, disablePush, enablePush, sendTestPush,
  type PushState,
} from "@/lib/push-client";
import { useApp } from "@/lib/store";
import { formatMinutes, isValidTimezone, parseTime } from "@/lib/time";

const CLASS_LEADS = [0, 5, 10, 15, 20, 30, 45, 60];
const TASK_LEADS = [0, 10, 15, 30, 60, 120, 180];
const EXAM_DAYS = [1, 2, 3, 5, 7, 14, 30];

export default function SettingsPage() {
  const { data, userId, updatePrefs, updateProfile, signOut } = useApp();
  const prefs = data.prefs;
  const preview = useContext(PreviewContext);
  const href = useAppHref();
  const { theme, setTheme } = useAppearance();

  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const refreshPushState = async () => {
    const env = detectEnvironment();
    const sub = await currentSubscription();
    setPush({ ...env, subscribed: Boolean(sub) });
  };
  // Reads the browser's PushManager — an external system whose state React
  // cannot derive. The setState happens after an await, not synchronously.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refreshPushState(); }, []);

  const setLeads = (key: "class_lead_minutes" | "task_lead_minutes" | "exam_lead_days", value: number) => {
    if (!prefs) return;
    const current = prefs[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value].sort((a, b) => a - b);
    void updatePrefs({ [key]: next });
  };

  async function toggleNotifications(on: boolean) {
    if (!userId) return;
    setBusy(true);
    setMessage(null);
    try {
      if (preview) { setMessage({ tone: "success", text: "Reminder preferences work in preview. Sign in to your own workspace to enable real device notifications." }); return; }
      if (on) {
        const res = await enablePush(userId);
        setMessage(res.ok
          ? { tone: "success", text: "Notifications are on for this device." }
          : { tone: "danger", text: res.error });
      } else {
        await disablePush();
        setMessage({ tone: "success", text: "Notifications turned off for this device." });
      }
      await refreshPushState();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Could not update notifications. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="flex items-center gap-3">
        <Link href={href("/today")} aria-label="Back" className="rounded-lg p-1.5 text-dim hover:bg-surface-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
        </Link>
        <div><h1 className="page-heading">Make yourself at home.</h1><p className="page-subtitle">Your appearance, reminders and account.</p></div>
      </header>

      <div className="settings-grid">
      <section className="flex flex-col gap-3"><h2 className="section-heading">Appearance</h2><Card className="p-5"><p className="mb-4 text-sm text-dim">A lighter start. A quieter evening. Choose what feels right.</p><div className="grid grid-cols-3 gap-2" role="group" aria-label="Appearance">{([{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }] as const).map((option) => <button key={option.value} aria-pressed={theme === option.value} onClick={() => setTheme(option.value)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${theme === option.value ? "border-brand bg-brand-soft text-brand" : "border-line text-dim"}`}><Icon name={option.icon} />{option.label}</button>)}</div></Card></section>

      <section className="flex flex-col gap-3"><h2 className="section-heading">Your data, in your hands</h2><Card className="flex flex-col gap-4 p-5"><p className="text-sm leading-relaxed text-dim">Download your subjects, schedule, events, both task lists and attendance as a JSON backup.</p><Button onClick={() => {
        const blob = new Blob([JSON.stringify({ app: "Klasso", version: 2, exported_at: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `klasso-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage({ tone: "success", text: preview ? "Sample backup downloaded." : "Backup downloaded. Keep a copy somewhere safe." });
      }}><Icon name="download" size={17} />Download backup</Button><p className="text-xs text-dim">Includes your personal planner data. Passwords and login tokens are excluded.</p></Card></section>

      {/* ----------------------------------------------- notifications */}
      <section className="flex flex-col gap-2">
        <h2 className="section-heading">Notifications</h2>

        {push?.needsInstall && (
          <Banner tone="warn">
            <strong>Install Klasso first.</strong> On iPhone, notifications only work from the
            installed app. Tap the Share button in Safari, choose <em>Add to Home Screen</em>,
            then open Klasso from your home screen and come back here.
          </Banner>
        )}
        {push && !push.supported && !push.needsInstall && (
          <Banner tone="danger">This browser cannot deliver push notifications.</Banner>
        )}
        {push?.permission === "denied" && (
          <Banner tone="danger">
            Notifications are blocked for Klasso. Allow them in your device settings, then
            turn them on again here.
          </Banner>
        )}
        {message && <Banner tone={message.tone}>{message.text}</Banner>}

        <Card className="px-4 py-1">
          <Toggle
            checked={Boolean(push?.subscribed)}
            disabled={busy}
            onChange={(v) => void toggleNotifications(v)}
            label="Push notifications on this device"
            description={
              push?.subscribed
                ? "This device will receive reminders."
                : "Turn on to get reminders even when the app is closed."
            }
          />
        </Card>

        {push?.subscribed && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await sendTestPush();
              setMessage(res.ok
                ? { tone: "success", text: "Sent — it should arrive in a moment." }
                : { tone: "danger", text: res.error });
              setBusy(false);
            }}
          >
            {busy && <Spinner className="h-4 w-4" />} Send a test notification
          </Button>
        )}
      </section>

      {!prefs ? (
        <Card className="p-4 text-sm text-dim">Loading your preferences…</Card>
      ) : (
        <>
          {/* ------------------------------------------- class reminders */}
          <section className="flex flex-col gap-2">
            <h2 className="section-heading">Before each class</h2>
            <Card className="px-4 py-1">
              <Toggle
                checked={prefs.class_enabled}
                onChange={(v) => void updatePrefs({ class_enabled: v })}
                label="Class reminders"
                description="A notification before every class on your timetable."
              />
            </Card>
            {prefs.class_enabled && (
              <Card className="p-4">
                <p className="mb-2.5 text-sm font-semibold text-dim">
                  Remind me this long before:
                </p>
                <ChipRow
                  values={CLASS_LEADS}
                  selected={prefs.class_lead_minutes}
                  onToggle={(v) => setLeads("class_lead_minutes", v)}
                  format={(v) => (v === 0 ? "At start" : `${v} min`)}
                />
                {prefs.class_lead_minutes.length === 0 && (
                  <p className="mt-2 text-xs font-semibold text-warn">
                    Nothing selected — no class reminders will be sent.
                  </p>
                )}
                {prefs.class_lead_minutes.length > 1 && (
                  <p className="mt-2 text-xs text-faint">
                    You&apos;ll get {prefs.class_lead_minutes.length} separate notifications per class.
                  </p>
                )}
              </Card>
            )}
          </section>

          {/* --------------------------------------------- task reminders */}
          <section className="flex flex-col gap-2">
            <h2 className="section-heading">Task reminders</h2>
            <Card className="px-4 py-1">
              <Toggle
                checked={prefs.task_enabled}
                onChange={(v) => void updatePrefs({ task_enabled: v })}
                label="Task reminders"
                description="For tasks that have a due date."
              />
            </Card>
            {prefs.task_enabled && (
              <Card className="flex flex-col gap-4 p-4">
                <div>
                  <p className="mb-2.5 text-sm font-semibold text-dim">
                    For tasks with a time, remind me before:
                  </p>
                  <ChipRow
                    values={TASK_LEADS}
                    selected={prefs.task_lead_minutes}
                    onToggle={(v) => setLeads("task_lead_minutes", v)}
                    format={(v) => (v === 0 ? "When due" : v >= 60 ? `${v / 60} hr` : `${v} min`)}
                  />
                </div>
                <Field
                  label="For tasks with no time, remind me at"
                  hint="A single nudge on the morning it's due."
                >
                  <Input
                    type="time"
                    value={prefs.task_allday_time.slice(0, 5)}
                    onChange={(e) => void updatePrefs({ task_allday_time: e.target.value })}
                  />
                </Field>
              </Card>
            )}
          </section>

          {/* ------------------------------------------------------ exams */}
          <section className="flex flex-col gap-2">
            <h2 className="section-heading">Exams & events</h2>
            <Card className="px-4 py-1">
              <Toggle
                checked={prefs.exam_enabled}
                onChange={(v) => void updatePrefs({ exam_enabled: v })}
                label="Exam countdown"
                description="Warnings in the days leading up to each exam."
              />
            </Card>
            {prefs.exam_enabled && (
              <Card className="flex flex-col gap-4 p-4">
                <div>
                  <p className="mb-2.5 text-sm font-semibold text-dim">Warn me this many days before:</p>
                  <ChipRow
                    values={EXAM_DAYS}
                    selected={prefs.exam_lead_days}
                    onToggle={(v) => setLeads("exam_lead_days", v)}
                    format={(v) => `${v}d`}
                  />
                  <p className="mt-2 text-xs text-faint">
                    Sent with your morning summary at {formatMinutes(parseTime(prefs.day_summary_time))}.
                  </p>
                </div>
                <div>
                  <p className="mb-2.5 text-sm font-semibold text-dim">And before it starts:</p>
                  <ChipRow
                    values={TASK_LEADS}
                    selected={prefs.exam_lead_minutes}
                    onToggle={(v) => {
                      const next = prefs.exam_lead_minutes.includes(v)
                        ? prefs.exam_lead_minutes.filter((x) => x !== v)
                        : [...prefs.exam_lead_minutes, v].sort((a, b) => a - b);
                      void updatePrefs({ exam_lead_minutes: next });
                    }}
                    format={(v) => (v === 0 ? "At start" : v >= 60 ? `${v / 60} hr` : `${v} min`)}
                  />
                </div>
              </Card>
            )}
          </section>

          {/* -------------------------------------------- morning summary */}
          <section className="flex flex-col gap-2">
            <h2 className="section-heading">Daily summary</h2>
            <Card className="px-4 py-1">
              <Toggle
                checked={prefs.day_summary_enabled}
                onChange={(v) => void updatePrefs({ day_summary_enabled: v })}
                label="Morning rundown"
                description="How many classes, when they start and end, what's due."
              />
            </Card>
            {prefs.day_summary_enabled && (
              <Card className="p-4">
                <Field label="Send it at">
                  <Input
                    type="time"
                    value={prefs.day_summary_time.slice(0, 5)}
                    onChange={(e) => void updatePrefs({ day_summary_time: e.target.value })}
                  />
                </Field>
              </Card>
            )}
          </section>

          {/* ------------------------------ study, activities and meetings */}
          {([
            { key: "study", title: "Study sessions", icon: "book",
              blurb: "Before revision you have planned on the Planning tab.", fallback: 10 },
            { key: "activity", title: "Activities", icon: "sun",
              blurb: "Sport, societies, anything you have put on a day.", fallback: 30 },
            { key: "meeting", title: "Meetings", icon: "clock",
              blurb: "Group work, office hours, anything with other people.", fallback: 15 },
          ] as const).map((item) => {
            const enabled = prefs[`${item.key}_enabled`] ?? true;
            const lead = prefs[`${item.key}_lead_minutes`] ?? item.fallback;
            return (
              <section key={item.key} className="flex flex-col gap-2">
                <h2 className="section-heading">{item.title}</h2>
                <Card className="px-4 py-1">
                  <Toggle
                    checked={enabled}
                    onChange={(v) => void updatePrefs({ [`${item.key}_enabled`]: v })}
                    label={`${item.title} reminders`}
                    description={item.blurb}
                  />
                </Card>
                {enabled && (
                  <Card className="p-4">
                    <Slider
                      label="Remind me this long before"
                      value={lead}
                      min={0} max={120} step={5}
                      onChange={(v) => void updatePrefs({ [`${item.key}_lead_minutes`]: v })}
                      format={(v) =>
                        v === 0 ? "At the start" : v >= 60
                          ? `${v / 60} hr${v >= 120 ? "s" : ""}${v % 60 ? ` ${v % 60} min` : ""}`
                          : `${v} min`}
                    />
                  </Card>
                )}
              </section>
            );
          })}

          {/* ------------------------------------------------ quiet hours */}
          <section className="flex flex-col gap-2">
            <h2 className="section-heading">Quiet hours</h2>
            <Card className="px-4 py-1">
              <Toggle
                checked={prefs.quiet_enabled}
                onChange={(v) => void updatePrefs({ quiet_enabled: v })}
                label="Silence notifications overnight"
                description="Anything due in this window is skipped, not delayed."
              />
            </Card>
            {prefs.quiet_enabled && (
              <Card className="flex gap-3 p-4">
                <Field label="From">
                  <Input type="time" value={prefs.quiet_start.slice(0, 5)}
                         onChange={(e) => void updatePrefs({ quiet_start: e.target.value })} />
                </Field>
                <Field label="Until">
                  <Input type="time" value={prefs.quiet_end.slice(0, 5)}
                         onChange={(e) => void updatePrefs({ quiet_end: e.target.value })} />
                </Field>
              </Card>
            )}
          </section>
        </>
      )}

      {/* -------------------------------------------------------- account */}
      <section className="flex flex-col gap-2">
        <h2 className="section-heading">Account</h2>
        <Card className="flex flex-col gap-4 p-4">
          <Field label="Display name"><Input key={data.profile?.display_name} defaultValue={data.profile?.display_name ?? ""} placeholder="Your name" maxLength={60} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== data.profile?.display_name) void updateProfile({ display_name: name }); }} /></Field>
          <Field
            label="Time zone"
            hint="Choose where you attend college. Reminders follow this timezone."
          >
            <Dropdown
              aria-label="Time zone"
              value={data.profile?.timezone ?? "UTC"}
              onChange={(v) => void updateProfile({ timezone: v })}
              options={timezoneOptions(data.profile?.timezone).map((tz) => ({ value: tz, label: tz }))}
            />
          </Field>
          <p className="text-sm text-dim">
            Signed in as <span className="font-semibold text-ink">{data.profile?.display_name ?? "you"}</span>
          </p>
          <Button variant="danger" onClick={() => void signOut()}>Sign out</Button>
        </Card>
      </section>
      </div>

      <p className="pb-2 text-center text-xs text-faint">Klasso</p>
    </div>
  );
}

function ChipRow({
  values, selected, onToggle, format,
}: {
  values: number[];
  selected: number[];
  onToggle: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            onClick={() => onToggle(v)}
            aria-pressed={on}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95",
              on ? "bg-brand text-bg" : "bg-surface-2 text-dim",
            )}
          >
            {format(v)}
          </button>
        );
      })}
    </div>
  );
}

/** The browser's own zone first, then a short list of common ones. */
function timezoneOptions(current: string | undefined): string[] {
  const guessed = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const common = [
    "Asia/Dubai", "Asia/Kolkata", "Asia/Karachi", "Asia/Singapore", "Asia/Tokyo",
    "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles",
    "Australia/Sydney", "UTC",
  ];
  const all = [guessed, current, ...common].filter(
    (tz): tz is string => Boolean(tz) && isValidTimezone(tz as string),
  );
  return [...new Set(all)];
}

import type { Metadata } from "next";
import { CONTACT, LegalPage } from "../legal/legal";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The deal between you and Klasso. Short, because it is a small app."
    >
      <h2>What Klasso is</h2>
      <p>
        A personal planner for college: your timetable, exams, attendance, tasks and
        reminders. It is provided free of charge, as a personal project.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for keeping your sign-in details to yourself and for what
        happens under your account. Tell us at {CONTACT} if you think someone else has
        access to it.
      </p>

      <h2>Reasonable use</h2>
      <ul>
        <li>Do not try to break, overload or probe the service, or access other people’s data.</li>
        <li>Do not use Klasso to store anything unlawful.</li>
        <li>Automated or bulk use is not supported and may be blocked.</li>
      </ul>

      <h2>Reminders are best effort</h2>
      <p>
        Notifications depend on your device, your browser and third-party push services.
        They are usually reliable, but Klasso cannot guarantee any particular reminder
        arrives or arrives on time. Do not rely on it alone for something that matters —
        an exam, for instance.
      </p>

      <h2>Availability</h2>
      <p>
        The service is offered as it is, with no warranty. It may be unavailable,
        change, or stop entirely. Export a backup from Settings if your data matters to
        you. To the extent the law allows, Klasso is not liable for any loss arising
        from using it or from being unable to use it.
      </p>

      <h2>Your content</h2>
      <p>
        What you put into Klasso stays yours. Permission is only ever used to store and
        display it back to you, and to send the reminders you ask for.
      </p>

      <h2>Ending it</h2>
      <p>
        You can stop at any time and ask for your account to be deleted. Accounts that
        abuse the service may be suspended.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may change; the date at the top shows when. Continuing to use Klasso
        means the new version applies.
      </p>
    </LegalPage>
  );
}

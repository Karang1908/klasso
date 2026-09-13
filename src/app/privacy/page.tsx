import type { Metadata } from "next";
import { CONTACT, LegalPage } from "../legal/legal";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      intro="What Klasso stores, why, and what it never does."
    >
      <h2>The short version</h2>
      <p>
        Klasso keeps your timetable so it can show it back to you and remind you before
        class. There are no analytics, no trackers, no advertising, and nothing is sold
        or shared with anyone for marketing.
      </p>

      <h2>What is stored</h2>
      <ul>
        <li><strong>Your account</strong> email address, the display name you choose, your timezone and whether you prefer a 12- or 24-hour clock.</li>
        <li><strong>Your planner</strong> subjects, timetable, one-off schedule changes, exams and events, tasks, attendance records and study plans.</li>
        <li><strong>Reminders</strong> your notification preferences, and a push subscription for each device you enable notifications on.</li>
        <li><strong>A delivery log</strong> the title and time of reminders already sent, so the same one is never sent twice. Entries are deleted automatically after 30 days.</li>
      </ul>
      <p>
        Passwords are never stored by Klasso; authentication is handled by Supabase, and
        a password is only ever held as a salted hash on their side.
      </p>

      <h2>Who else touches it</h2>
      <ul>
        <li><strong>Supabase</strong> the database and sign-in service where your data lives.</li>
        <li><strong>Vercel</strong> hosts the app and serves the pages.</li>
        <li><strong>Google</strong> only if you choose “Continue with Google”. Klasso receives your email address, name and profile picture, and uses them solely to create and identify your account.</li>
        <li><strong>Apple and Google push services</strong> deliver notifications to your device. They receive the notification text in order to deliver it.</li>
      </ul>
      <p>No one else receives your data, and it is not used to train anything.</p>

      <h2>Your data is yours</h2>
      <ul>
        <li><strong>Take a copy</strong> Settings → Account &amp; data → Download backup exports everything as JSON.</li>
        <li><strong>Delete it</strong> email {CONTACT} and the account and everything in it is removed. Deletion is permanent.</li>
        <li><strong>Turn reminders off</strong> Settings, at any time. Removing a device also removes its push subscription.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Every table is protected by row-level security, so a signed-in account can only
        ever read and write its own rows. Traffic is encrypted in transit. No system is
        perfect, and this is a small personal project rather than a company with a
        security team, so please do not store anything sensitive in it.
      </p>

      <h2>Children</h2>
      <p>Klasso is meant for college and university students and is not directed at children under 13.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects what is collected, the date at the
        top changes too. Continuing to use Klasso after that means the new version applies.
      </p>
    </LegalPage>
  );
}

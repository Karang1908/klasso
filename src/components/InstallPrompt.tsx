"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AnimatedBrandMark, Icon } from "./icons";
import { Button } from "./ui";
import { snoozeInstall, useInstall } from "@/lib/install";
import { haptic } from "@/lib/haptics";

/** iOS's own Share glyph. Drawn rather than described, because "tap Share" is
 *  useless if you cannot tell which of the toolbar icons it is. */
function ShareGlyph({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13M8.5 6.5 12 3l3.5 3.5M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

/**
 * Offered once the user is signed in and has something worth keeping.
 *
 * On iOS this is not a nicety: web push is only delivered to an installed
 * home-screen app, so without this a user can switch every reminder on and
 * still never receive one.
 */
export function InstallPrompt() {
  const { mode, install } = useInstall();
  const reduced = useReducedMotion();
  const show = mode === "prompt" || mode === "ios-manual";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="install-card"
          role="dialog"
          aria-label="Add Klasso to your home screen"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 32 }}
        >
          <span className="install-mark"><AnimatedBrandMark size={42} animate={false} /></span>
          <div className="install-copy">
            <strong>Keep Klasso one tap away</strong>
            {mode === "prompt" ? (
              <p>Add it to your home screen and it opens like any other app, and reminders can reach you.</p>
            ) : (
              <p>
                Tap <ShareGlyph /> in the Safari toolbar, then <b>Add to Home Screen</b>.
                Reminders only arrive once it is installed.
              </p>
            )}
          </div>
          <div className="install-actions">
            {mode === "prompt" && (
              <Button variant="primary" onClick={() => { haptic("commit"); void install(); }}>
                <Icon name="download" size={17} />Install app
              </Button>
            )}
            <Button
              variant="ghost"
              aria-label="Not now"
              onClick={() => { haptic("select"); snoozeInstall(); window.dispatchEvent(new Event("klasso:installable")); }}
            >
              Not now
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

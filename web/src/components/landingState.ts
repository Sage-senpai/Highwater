// Whether the visitor has already seen the landing page, stored per
// browser so a repeat visit goes straight to the map.
const DISMISS_KEY = "highwater:intro-dismissed";

export function isIntroDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setIntroDismissed(value: boolean): void {
  try {
    if (value) localStorage.setItem(DISMISS_KEY, "1");
    else localStorage.removeItem(DISMISS_KEY);
  } catch {
    // Private browsing or blocked storage. The landing page just
    // reappears next visit, which is a reasonable fallback, not a bug.
  }
}

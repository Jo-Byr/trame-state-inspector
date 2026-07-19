// Runs in the ISOLATED world (default for content scripts), so it has
// access to chrome.* APIs but not to the page's window.trame directly.
// It relays state posted by inject.js (MAIN world) to the extension.
//
// Wrapped in an IIFE: content scripts persist their JS context across
// extension reloads until the page itself navigates/refreshes, so a
// top-level `let`/`const` throws "Identifier has already been declared"
// the moment the extension is reloaded and re-injects into the same tab.
(function () {
  let content_relayed = false;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== "trame-state-inspector") return;

    if (!content_relayed) {
      content_relayed = true;
      console.log("[trame-state-inspector] content.js relaying state to extension runtime");
    }

    chrome.runtime.sendMessage({
      type: "TRAME_STATE_UPDATE",
      state: event.data.state
    }).catch((err) => {
      // No receiver (side panel not open yet) - safe to ignore, next tick retries.
      console.debug("[trame-state-inspector] sendMessage had no receiver:", err?.message);
    });
  });
})();

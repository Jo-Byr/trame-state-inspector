// Runs in the page's own (MAIN) world, so it can see the same
// `window` the trame app set `window.trame` on. Content scripts run in
// an isolated world by default and can never see this directly, which
// is why it's split into inject.js (MAIN world) + content.js (ISOLATED world).
(function () {
  const INTERVAL_MS = 1000;
  const SOURCE = "trame-state-inspector";
  let found = false;

  function getTrameState() {
    // window.trame.state.state and trame.state.state are the same object
    // here since this script runs in the page's global scope.
    if (window.trame && window.trame.state && window.trame.state.state) {
      return window.trame.state.state;
    }
    return null;
  }

  console.log("[trame-state-inspector] inject.js loaded in page world");

  setInterval(() => {
    const state = getTrameState();
    if (!state) return;

    if (!found) {
      found = true;
      console.log(
        "[trame-state-inspector] window.trame.state.state found. type:",
        Object.prototype.toString.call(state),
        "keys:", Object.keys(state)
      );
    }

    let payload;
    try {
      // A plain JSON.stringify silently turns a Map/Set into "{}"/"[]"
      // since their entries live in internal slots, not own enumerable
      // properties - this replacer converts them to plain equivalents
      // first so nested Maps/Sets in the state survive the round-trip.
      payload = JSON.parse(JSON.stringify(state, (key, val) => {
        if (val instanceof Map) return Object.fromEntries(val);
        if (val instanceof Set) return Array.from(val);
        return val;
      }));
    } catch (err) {
      console.error("[trame-state-inspector] could not serialize state:", err);
      return;
    }

    window.postMessage({ source: SOURCE, state: payload }, "*");
  }, INTERVAL_MS);
})();

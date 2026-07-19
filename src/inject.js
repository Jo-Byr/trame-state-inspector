// Runs in the page's own (MAIN) world, so it can see the same
// `window` the trame app set `window.trame` on. Content scripts run in
// an isolated world by default and can never see this directly, which
// is why it's split into inject.js (MAIN world) + content.js (ISOLATED world).
(function () {
  const DISCOVER_INTERVAL_MS = 1000;
  const FLUSH_INTERVAL_MS = 250;
  const SOURCE = "trame-state-inspector";

  let found = false;
  const watchedKeys = [];
  const watchers = {};

  // Accumulate changes between flushes rather than posting on every
  // single trame.state.watch() callback, so a burst of updates to the
  // same key only ships its latest value once per flush.
  let pendingCreated = {};
  let pendingUpdated = {};
  let pendingDeleted = [];

  function getTrameState() {
    // window.trame.state.state and trame.state.state are the same object
    // here since this script runs in the page's global scope.
    if (window.trame && window.trame.state && window.trame.state.state) {
      return window.trame.state.state;
    }
    return null;
  }

  // A plain JSON.stringify silently turns a Map/Set into "{}"/"[]" since
  // their entries live in internal slots, not own enumerable properties -
  // this replacer converts them to plain equivalents first.
  function toPlain(value) {
    return JSON.parse(JSON.stringify(value, (key, val) => {
      if (val instanceof Map) return Object.fromEntries(val);
      if (val instanceof Set) return Array.from(val);
      return val;
    }));
  }

  function discoverKeys() {
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

    const currentKeys = Object.keys(state);

    for (const key of currentKeys) {
      if (watchedKeys.includes(key)) continue;

      watchedKeys.push(key);
      pendingCreated[key] = state[key];

      // trame.state.watch expects an ARRAY of names - the callback gets
      // one positional arg per name in that array. A bare string here
      // gets iterated character-by-character instead of used as a key.
      watchers[key] = trame.state.watch([key], (value) => {
        if (Object.prototype.hasOwnProperty.call(pendingCreated, key)) {
          // Still awaiting its first flush - keep it filed as "created"
          // so it isn't reported as both created and updated at once.
          pendingCreated[key] = value;
        } else {
          pendingUpdated[key] = value;
        }
      });
    }

    // Walk backwards so splice() doesn't skip an element.
    for (let i = watchedKeys.length - 1; i >= 0; i--) {
      const key = watchedKeys[i];
      if (currentKeys.includes(key)) continue;

      watchedKeys.splice(i, 1);
      delete watchers[key];
      delete pendingCreated[key];
      delete pendingUpdated[key];
      pendingDeleted.push(key);
    }
  }

  function flush() {
    const hasCreated = Object.keys(pendingCreated).length > 0;
    const hasUpdated = Object.keys(pendingUpdated).length > 0;
    const hasDeleted = pendingDeleted.length > 0;
    if (!hasCreated && !hasUpdated && !hasDeleted) return;

    let payload;
    try {
      payload = toPlain({
        created: pendingCreated,
        updated: pendingUpdated,
        deleted: pendingDeleted
      });
    } catch (err) {
      console.error("[trame-state-inspector] could not serialize diff:", err);
      return;
    }

    window.postMessage({ source: SOURCE, diff: payload }, "*");

    pendingCreated = {};
    pendingUpdated = {};
    pendingDeleted = [];
  }

  console.log("[trame-state-inspector] inject.js loaded in page world");

  setInterval(discoverKeys, DISCOVER_INTERVAL_MS);
  setInterval(flush, FLUSH_INTERVAL_MS);
})();

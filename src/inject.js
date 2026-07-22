// Runs in the page's own (MAIN) world, so it can see window.trame.
// It communicates with content.js through window.postMessage.

(function () {
  const DISCOVER_INTERVAL_MS = 1000;
  const FLUSH_INTERVAL_MS = 500;
  const SOURCE = "trame-state-inspector";

  let found = false;

  const watchedKeys = [];
  const watchers = {};

  let pendingCreated = {};
  let pendingUpdated = {};
  let pendingDeleted = [];


  function getTrameState() {
    if (
      window.trame &&
      window.trame.state &&
      window.trame.state.state
    ) {
      return window.trame.state.state;
    }

    return null;
  }


  function toPlain(value) {
    return JSON.parse(
      JSON.stringify(value, (key, val) => {
        if (val instanceof Map) {
          return Object.fromEntries(val);
        }

        if (val instanceof Set) {
          return Array.from(val);
        }

        return val;
      })
    );
  }


  function discoverKeys() {
    const state = getTrameState();

    if (!state) {
      return;
    }

    if (!found) {
      found = true;

      console.log(
        "[trame-state-inspector] window.trame.state.state found",
        Object.keys(state)
      );
    }

    const currentKeys = Object.keys(state);

    for (const key of currentKeys) {
      if (watchedKeys.includes(key)) {
        continue;
      }

      watchedKeys.push(key);

      pendingCreated[key] = state[key];

      watchers[key] = trame.state.watch(
        [key],
        (value) => {
          if (
            Object.prototype.hasOwnProperty.call(
              pendingCreated,
              key
            )
          ) {
            pendingCreated[key] = value;
          } else {
            pendingUpdated[key] = value;
          }
        }
      );
    }

    for (let i = watchedKeys.length - 1; i >= 0; i--) {
      const key = watchedKeys[i];

      if (currentKeys.includes(key)) {
        continue;
      }

      watchedKeys.splice(i, 1);

      delete watchers[key];
      delete pendingCreated[key];
      delete pendingUpdated[key];

      pendingDeleted.push(key);
    }
  }

  function flush() {
    const hasCreated =
      Object.keys(pendingCreated).length > 0;

    const hasUpdated =
      Object.keys(pendingUpdated).length > 0;

    const hasDeleted =
      pendingDeleted.length > 0;


    if (!hasCreated && !hasUpdated && !hasDeleted) {
      return;
    }


    let payload;

    try {
      payload = toPlain({
        created: pendingCreated,
        updated: pendingUpdated,
        deleted: pendingDeleted
      });
    } catch (err) {
      console.error(
        "[trame-state-inspector] could not serialize diff:",
        err
      );

      return;
    }


    window.postMessage(
      {
        source: SOURCE,
        type: "STATE_DIFF",
        diff: payload
      },
      "*"
    );


    pendingCreated = {};
    pendingUpdated = {};
    pendingDeleted = [];
  }


  // Receive edits from extension
  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) {
        return;
      }

      const data = event.data;

      if (
        !data ||
        data.source !== SOURCE ||
        data.type !== "STATE_SET"
      ) {
        return;
      }

      const trameState = window.trame?.state;

      if (
        !trameState ||
        typeof trameState.set !== "function"
      ) {
        console.warn(
          "[trame-state-inspector] trame.state.set() unavailable"
        );

        return;
      }

      trameState.set(
        data.key,
        data.value
      );
    }
  );

  console.log(
    "[trame-state-inspector] inject.js loaded in page world"
  );

  setInterval(
    discoverKeys,
    DISCOVER_INTERVAL_MS
  );

  setInterval(
    flush,
    FLUSH_INTERVAL_MS
  );
})();

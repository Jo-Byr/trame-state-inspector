// content.js - runs in the isolated content-script world.
// Bridges messages between the injected page script and the extension.

const SOURCE = "trame-state-inspector";

// Page -> extension.
window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data || {};
  if (data.source !== SOURCE) {
    return;
  }

  if (data.type === "TRAME_STATE_DIFF") {
    chrome.runtime.sendMessage({
      type: "TRAME_STATE_DIFF",
      diff: data.diff,
    });
  }
});

// Extension -> page.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRAME_STATE_SET") {
    window.postMessage(
      {
        source: SOURCE,
        type: "TRAME_STATE_SET",
        key: message.key,
        value: message.value,
      },
      "*"
    );
    return;
  }

  if (message.type === "TRAME_REQUEST_STATE") {
    // Correlate this request with the inject.js response, and time out
    // if inject.js isn't there (e.g. the page loaded before the
    // extension was installed and never ran inject.js).
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let done = false;

    const finish = (state) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", handler);
      sendResponse({ state });
    };

    const handler = (event) => {
      if (event.source !== window) return;
      const data = event.data || {};
      if (
        data.source !== SOURCE ||
        data.type !== "TRAME_STATE_FULL" ||
        data.requestId !== requestId
      ) {
        return;
      }
      finish(data.state);
    };

    window.addEventListener("message", handler);
    window.postMessage(
      { source: SOURCE, type: "TRAME_REQUEST_STATE", requestId },
      "*"
    );

    setTimeout(() => finish(null), 1500);

    // Keep the message channel open for the async response.
    return true;
  }
});

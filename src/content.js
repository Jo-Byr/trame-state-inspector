// Runs in the ISOLATED world.
// Bridges messages between inject.js (MAIN world)
// and extension runtime.

(function () {
  const SOURCE = "trame-state-inspector";

  let relayed = false;


  // MAIN world -> extension
  window.addEventListener(
    "message",
    (event) => {
      if (
        event.source !== window ||
        !event.data ||
        event.data.source !== SOURCE
      ) {
        return;
      }


      if (event.data.type !== "STATE_DIFF") {
        return;
      }


      if (!relayed) {
        relayed = true;

        console.log(
          "[trame-state-inspector] content.js relaying state to extension runtime"
        );
      }


      chrome.runtime
        .sendMessage({
          type: "TRAME_STATE_DIFF",
          diff: event.data.diff
        })
        .catch(() => {
          // Side panel may not be open
        });
    }
  );


  // extension -> MAIN world
  chrome.runtime.onMessage.addListener(
    (message) => {
      if (
        message.type !== "TRAME_STATE_SET"
      ) {
        return;
      }


      window.postMessage(
        {
          source: SOURCE,
          type: "STATE_SET",
          key: message.key,
          value: message.value
        },
        "*"
      );
    }
  );
})();

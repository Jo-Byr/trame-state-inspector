chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
});

chrome.runtime.onMessage.addListener(
  (message, sender) => {

    if (message.type !== "TRAME_STATE_SET") {
      return;
    }

    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs) => {
        if (!tabs[0]) return;

        chrome.tabs.sendMessage(
          tabs[0].id,
          message
        );
      }
    );
  }
);

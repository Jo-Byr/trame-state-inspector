const tabStates = new Map();

function getTabState(tabId) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      state: {},
      lastDiff: { created: {}, updated: {}, deleted: [] },
    });
  }
  return tabStates.get(tabId);
}

function applyDiff(tabState, diff) {
  for (const [key, value] of Object.entries(diff.created ?? {})) {
    tabState.state[key] = value;
  }
  for (const [key, value] of Object.entries(diff.updated ?? {})) {
    tabState.state[key] = value;
  }
  for (const key of diff.deleted ?? []) {
    delete tabState.state[key];
  }
  tabState.lastDiff = diff;
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

function getActiveTabId(windowId) {
  return new Promise((resolve) => {
    const query = { active: true };
    if (windowId != null) {
      query.windowId = windowId;
    } else {
      query.lastFocusedWindow = true;
    }
    chrome.tabs.query(query, ([tab]) => resolve(tab?.id ?? null));
  });
}

// Ask the tab's inject.js for a fresh snapshot. Returns true if the
// tab's cached state was replaced. This is what lets the panel open on
// an already-running trame app without a page reload, and recovers state
// after the service worker restarts.
function refreshTabState(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "TRAME_REQUEST_STATE" },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }

        // `null` means the page has no trame app; leave the (empty)
        // cached state alone rather than clobbering it with undefined.
        if (!response || response.state == null) {
          resolve(false);
          return;
        }

        const tabState = getTabState(tabId);
        for (const key of Object.keys(tabState.state)) {
          delete tabState.state[key];
        }
        Object.assign(tabState.state, response.state);
        tabState.lastDiff = { created: {}, updated: {}, deleted: [] };
        resolve(true);
      }
    );
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "TRAME_STATE_DIFF": {
      if (!sender.tab) return;

      const tabId = sender.tab.id;
      applyDiff(getTabState(tabId), message.diff);

      chrome.tabs.get(tabId, (tab) => {
        if (!tab || !tab.active) return;
        broadcast({
          type: "TRAME_STATE_DIFF",
          tabId,
          diff: message.diff,
        });
      });
      return;
    }

    case "TRAME_STATE_SET": {
      if (message.tabId == null) return;
      chrome.tabs.sendMessage(message.tabId, message);
      return;
    }

    case "GET_ACTIVE_TAB_STATE": {
      const windowId = message.windowId ?? null;

      getActiveTabId(windowId).then(async (tabId) => {
        if (tabId == null) {
          sendResponse(null);
          return;
        }

        // Pull a fresh snapshot before answering — this is what fixes
        // "nothing shows until I reload the page".
        await refreshTabState(tabId);

        const { state, lastDiff } = getTabState(tabId);
        sendResponse({ tabId, state, lastDiff });
      });

      return true;
    }
  }
});

async function notifyActiveTabChanged(tabId, windowId) {
  // Refresh on tab switch too, so a tab that was loaded while the
  // extension was reloaded doesn't show stale/empty state.
  await refreshTabState(tabId);

  const { state, lastDiff } = getTabState(tabId);
  broadcast({
    type: "ACTIVE_TAB_CHANGED",
    tabId,
    windowId,
    state,
    lastDiff,
  });
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  notifyActiveTabChanged(tabId, windowId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  getActiveTabId(windowId).then((tabId) => {
    if (tabId != null) {
      notifyActiveTabChanged(tabId, windowId);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

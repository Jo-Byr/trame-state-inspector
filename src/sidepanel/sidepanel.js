import { createApp, reactive, h } from "vue";
import "vuetify/styles";
import { createVuetify } from "vuetify";

import StateDiffViewer from "../StateDiffViewer/index.vue";
import StateStore from "../store/StateStore";

import "./sidepanel.css";

const vuetify = createVuetify();

let activeTabId = null;
let myWindowId = null;

function sendMessage(message) {
  if (message.type === "TRAME_STATE_SET") {
    message = { ...message, tabId: activeTabId };
  }
  chrome.runtime.sendMessage(message);
}

const store = reactive(new StateStore(sendMessage));

function applyTabState({ tabId, state, lastDiff }) {
  activeTabId = tabId;
  store.load(state, lastDiff);
}

chrome.windows.getCurrent((w) => {
  myWindowId = w?.id ?? null;

  chrome.runtime.sendMessage(
    { type: "GET_ACTIVE_TAB_STATE", windowId: myWindowId },
    (response) => {
      if (response) {
        applyTabState(response);
      }
    }
  );
});

chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case "TRAME_STATE_DIFF":
      // Content scripts also broadcast raw diffs; those have no tabId
      // tag and are dropped here. Tagged forwards are applied only when
      // they belong to the tab currently displayed.
      if (message.tabId !== activeTabId) {
        return;
      }
      store.applyDiff(message.diff);
      break;

    case "ACTIVE_TAB_CHANGED":
      // A tab change in another window must not hijack this panel.
      if (myWindowId != null && message.windowId !== myWindowId) {
        return;
      }
      applyTabState(message);
      break;
  }
});

const app = createApp({
  setup() {
    return () => h(StateDiffViewer, { store });
  },
});

app.use(vuetify).mount("#app");

console.log("[trame-state-inspector] sidepanel mounted");

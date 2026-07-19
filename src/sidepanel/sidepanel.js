import { createApp, shallowRef, h } from "vue";
import "vuetify/styles";
import { createVuetify } from "vuetify";

import StateDiffViewer from "../StateDiffViewer/index.vue";

import "./sidepanel.css";

const vuetify = createVuetify();

// Holds the latest diff message, fed by content.js relaying messages
// from inject.js (which runs in the inspected page). shallowRef avoids
// Vue auto-wrapping each incoming plain object in a reactive Proxy.
const diff = shallowRef(null);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TRAME_STATE_DIFF") {
    if (!diff.value) {
      console.log("[trame-state-inspector] sidepanel received first diff:", message.diff);
    }
    diff.value = message.diff;
  }
});

const app = createApp({
    components: {
        StateDiffViewer
    },
    setup() {
        // A string `template` here would need Vue's runtime compiler,
        // which the default Vite build of "vue" doesn't include - it
        // fails silently (console warning only) and renders nothing.
        // h() works with the runtime-only build.
        return () => h(StateDiffViewer, { diff: diff.value });
    }
});

app
    .use(vuetify)
    .mount("#app");

console.log("[trame-state-inspector] sidepanel mounted, waiting for state...");

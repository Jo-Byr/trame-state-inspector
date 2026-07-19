import { createApp, shallowRef, h } from "vue";
import "vuetify/styles";
import { createVuetify } from "vuetify";

import StateDiffViewer from "../StateDiffViewer/index.vue";

import "./sidepanel.css";

const vuetify = createVuetify();

// Reactive holder for the latest trame state, fed by content.js relaying
// messages from inject.js (which runs in the inspected page).
const state = shallowRef(null);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TRAME_STATE_UPDATE") {
    if (!state.value) {
      console.log("[trame-state-inspector] sidepanel received first state update:", message.state);
    }
    state.value = message.state;
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
        return () => h(StateDiffViewer, { state: state.value });
    }
});

app
    .use(vuetify)
    .mount("#app");

console.log("[trame-state-inspector] sidepanel mounted, waiting for state...");

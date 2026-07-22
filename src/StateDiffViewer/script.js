import DiffNode from "../DiffNode/index.vue";

const HIGHLIGHT_MS = 2000;
const FADE_MS = 1000;

export default {
  name: "StateDiffViewer",
  components: {
    DiffNode
  },

  props: {
    // {created:{key:value}, updated:{key:value}, deleted:[key]} - one
    // batch of top-level state changes, pushed in by sidepanel.js as it
    // receives TRAME_STATE_DIFF messages relayed from the page. We no
    // longer receive full snapshots, so there's nothing left to run a
    // recursive deepDiffMapper.map(previous, current) over - trame's
    // own trame.state.watch() already tells us exactly which top-level
    // keys changed and how, so we just apply that directly.
    diff: {
      type: Object,
      default: null
    }
  },

  data() {
    return {
      // Live top-level key -> value map, built up incrementally from
      // every diff we've applied so far (not a snapshot from the page).
      model: {},
      expanded: new Set(),
      // Top-level key -> 'created' | 'updated' | 'deleted'. Each entry
      // is time-limited (see markHighlight) rather than living until
      // the next unrelated diff happens to arrive.
      highlights: new Map(),
      // Keys currently in their fade-out window.
      fading: new Set(),
      // key -> { solid, fade } timeout ids, so a key that changes again
      // mid-highlight restarts its own timer instead of stacking timers.
      timers: new Map(),
      filterString: '',
    };
  },

  watch: {
    diff(newDiff) {
      if (!newDiff) return;

      for (const [key, value] of Object.entries(newDiff.created || {})) {
        this.model[key] = value;
        this.markHighlight(key, "created");
      }

      for (const [key, value] of Object.entries(newDiff.updated || {})) {
        this.model[key] = value;
        this.markHighlight(key, "updated");
      }

      for (const key of newDiff.deleted || []) {
        delete this.model[key];
        this.markHighlight(key, "deleted");
      }
    }
  },

  methods: {
    // Solid highlight for HIGHLIGHT_MS, then fades over FADE_MS, then
    // clears. Restarts cleanly if the same key changes again mid-fade.
    markHighlight(key, type){
      const existing = this.timers.get(key);
      if (existing) {
        clearTimeout(existing.solid);
        clearTimeout(existing.fade);
      }

      this.highlights.set(key, type);
      this.fading.delete(key);

      const solid = setTimeout(() => {
        this.fading.add(key);
      }, HIGHLIGHT_MS);

      const fade = setTimeout(() => {
        this.highlights.delete(key);
        this.fading.delete(key);
        this.timers.delete(key);
      }, HIGHLIGHT_MS + FADE_MS);

      this.timers.set(key, { solid, fade });
    },

    toggle(path){
      if(this.expanded.has(path)) {
        this.expanded.delete(path);
      } else {
        this.expanded.add(path);
      }
      this.expanded = new Set(this.expanded);
    },

    isExpanded(path){
      return this.expanded.has(path);
    },

    // Highlights only exist for top-level keys (that's the granularity
    // trame.state.watch() gives us), so classFor() only ever lights up
    // root rows - nested paths simply won't be in the map.
    classFor(path){
      const type = this.highlights.get(path);
      if (!type) return "";
      return this.fading.has(path) ? `diff-${type} diff-fading` : `diff-${type}`;
    }
  }
};

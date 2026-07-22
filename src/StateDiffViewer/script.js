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
      stateModel: {},
      treeModel: {},
      nodeMap: new Map(),
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
      showMenu: false,
    };
  },

  watch: {
    diff(newDiff) {
      if (!newDiff) return;

      for (const [key, value] of Object.entries(newDiff.created || {})) {
        this.stateModel[key] = value;
        const node = this.addTreeNode(key, value);
        this.markHighlight(node, "created");
      }

      for (const [key, value] of Object.entries(newDiff.updated || {})) {
        this.stateModel[key] = value;
        const node = this.addTreeNode(key, value);
        this.markHighlight(node, "updated");
      }

      for (const key of newDiff.deleted || []) {
        delete this.stateModel[key];
        this.removeTreeNode(key);
      }
    }
  },

  methods: {
    // Solid highlight for HIGHLIGHT_MS, then fades over FADE_MS, then
    // clears. Restarts cleanly if the same key changes again mid-fade.
    // If the node is collapsed, highlight the parent too recursively,
    // until we reach anon-collapsed parent
    markHighlight(node, type){
      while (node !== null && !this.isExpanded(node.id)) {
        const id = node.id;
        const existing = this.timers.get(id);
        if (existing) {
          clearTimeout(existing.solid);
          clearTimeout(existing.fade);
        }

        this.highlights.set(id, type);
        this.fading.delete(id);

        const solid = setTimeout(() => {
          this.fading.add(id);
        }, HIGHLIGHT_MS);

        const fade = setTimeout(() => {
          this.highlights.delete(id);
          this.fading.delete(id);
          this.timers.delete(id);
        }, HIGHLIGHT_MS + FADE_MS);

        this.timers.set(id, { solid, fade });
        if (node.parentId !== null) {
          node = this.getNodeById(node.parentId);
          if (node === null) {
            return;
          }
        } else {
          return;
        }
      }
    },

    getNodeById(id) {
      return this.nodeMap.get(id) ?? null;
    },

    toggle(id){
      if(this.expanded.has(id)) {
        this.expanded.delete(id);
      } else {
        this.expanded.add(id);
      }
      this.expanded = new Set(this.expanded);
    },

    isExpanded(id){
      return this.expanded.has(id);
    },

    classFor(id){
      const type = this.highlights.get(id);
      if (!type) return "";
      return this.fading.has(id) ? `diff-${type} diff-fading` : `diff-${type}`;
    },

    getNamespaceKeys(key) {
      return key.split("__");
    },

    addTreeNode(key, value) {
      let source = this.treeModel;
      const namespaceKeys = this.getNamespaceKeys(key);
      for (const [i, subKey] of namespaceKeys.slice(0, namespaceKeys.length - 1).entries()) {
        if (source[subKey] === undefined) {
          let id = namespaceKeys.slice(0, i + 1).join('.');
          source[subKey] = {
            type: 'namespace',
            name: subKey,
            id,
            parentId: i === 0 ? null : namespaceKeys.slice(0, i).join('.'),
            value: {},
          };
          this.nodeMap.set(id, source[subKey]);
        }
        source = source[subKey].value;
      }
      let id = namespaceKeys.join('.');
      const node = this.makeNodeValue(
        value,
        namespaceKeys[namespaceKeys.length - 1],
        id,
        namespaceKeys.length > 1 ? namespaceKeys.slice(0, namespaceKeys.length - 1).join('.') : null,
      );
      source[namespaceKeys[namespaceKeys.length - 1]] = node;
      return node;
    },

    makeNodeValue(value, name, id, parentId) {
      let nodeValue = value;
      if (typeof(value) === 'object') {
        if (Array.isArray(value)) {
          nodeValue = value.map((val, i) => this.makeNodeValue(val, i, `${id}.${i}`, id));
        } else if (value !== null && value !== undefined) {
          nodeValue = {};
          for (const [key, val] of Object.entries(value)) {
            nodeValue[key] = this.makeNodeValue(val, key, `${id}.${key}`, id);
          }
        }
      }
      const node = {
        type: 'value',
        name,
        id,
        parentId,
        value: nodeValue,
      };
      this.nodeMap.set(id, node);
      return node;
    }
  }
};

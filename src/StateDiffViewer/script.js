import DiffNode from "../DiffNode/index.vue";
import { getNodeValue, nodeMatchesFilter } from "../helper.js";

const HIGHLIGHT_MS = 2000;
const FADE_MS = 1000;

export default {
  name: "StateDiffViewer",
  components: { DiffNode },

  props: {
    store: { type: Object, required: true },
  },

  data() {
    return {
      treeModel: {},
      nodeMap: new Map(),
      expanded: new Set(),
      highlights: new Map(),
      fading: new Set(),
      timers: new Map(),
      filterString: "",
      showMenu: false,
    };
  },

  computed: {
    // Top-level nodes that match the current filter. When the filter is
    // empty the whole tree is returned. DiffNode handles the deeper
    // levels itself using the same matcher.
    visibleTree() {
      const q = (this.filterString || "").trim().toLowerCase();
      if (!q) {
        return this.treeModel;
      }

      const result = {};
      for (const [key, node] of Object.entries(this.treeModel)) {
        if (nodeMatchesFilter(node, q)) {
          result[key] = node;
        }
      }
      return result;
    },
  },

  watch: {
    "store.version": {
      handler() {
        this.rebuildFromState();
        this.applyHighlights(this.store.lastDiff);
      },
      immediate: true,
    },
  },

  mounted() {
    // Belt-and-braces: if the store was already populated before this
    // component was created, build the tree now. The watcher above will
    // keep it in sync from here on.
    this.rebuildFromState();
    this.applyHighlights(this.store.lastDiff);

    console.log(
      "[trame-state-inspector] viewer mounted, state keys:",
      Object.keys(this.store.state)
    );
  },

  methods: {
    rebuildFromState() {
      this.treeModel = {};
      this.nodeMap.clear();

      for (const [key, value] of Object.entries(this.store.state)) {
        this.addTreeNode(key, value);
      }

      console.log(
        "[trame-state-inspector] rebuilt tree, top-level keys:",
        Object.keys(this.treeModel)
      );
    },

    applyHighlights(diff) {
      if (!diff) {
        return;
      }

      const highlight = (keys, type) => {
        for (const key of keys) {
          const id = key.split("__").join(".");
          const node = this.nodeMap.get(id);
          if (node) {
            this.markHighlight(node, type);
          }
        }
      };

      highlight(Object.keys(diff.created || {}), "created");
      highlight(Object.keys(diff.updated || {}), "updated");
    },

    markHighlight(node, type) {
      do {
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
      } while (node !== null && !this.isExpanded(node.id));
    },

    getNodeById(id) {
      return this.nodeMap.get(id) ?? null;
    },

    toggle(id) {
      if (this.expanded.has(id)) {
        this.expanded.delete(id);
      } else {
        this.expanded.add(id);
      }
      this.expanded = new Set(this.expanded);
    },

    isExpanded(id) {
      return this.expanded.has(id);
    },

    classFor(id) {
      const type = this.highlights.get(id);
      if (!type) return "";
      return this.fading.has(id)
        ? `diff-${type} diff-fading`
        : `diff-${type}`;
    },

    getNamespaceKeys(key) {
      return key.split("__");
    },

    addTreeNode(key, value) {
      let source = this.treeModel;
      const namespaceKeys = this.getNamespaceKeys(key);

      for (const [i, subKey] of namespaceKeys
        .slice(0, namespaceKeys.length - 1)
        .entries()) {
        if (source[subKey] === undefined) {
          const id = namespaceKeys.slice(0, i + 1).join(".");
          source[subKey] = {
            type: "namespace",
            name: subKey,
            id,
            parentId: i === 0 ? null : namespaceKeys.slice(0, i).join("."),
            value: {},
          };
          this.nodeMap.set(id, source[subKey]);
        }
        source = source[subKey].value;
      }

      const id = namespaceKeys.join(".");
      const node = this.makeNodeValue(
        value,
        namespaceKeys[namespaceKeys.length - 1],
        id,
        namespaceKeys.length > 1
          ? namespaceKeys.slice(0, namespaceKeys.length - 1).join(".")
          : null
      );

      source[namespaceKeys[namespaceKeys.length - 1]] = node;
      node.stateKey = key;
      return node;
    },

    makeNodeValue(value, name, id, parentId) {
      let nodeValue = value;

      if (typeof value === "object") {
        if (Array.isArray(value)) {
          nodeValue = value.map((val, i) =>
            this.makeNodeValue(val, i, `${id}.${i}`, id)
          );
        } else if (value !== null && value !== undefined) {
          nodeValue = {};
          for (const [key, val] of Object.entries(value)) {
            nodeValue[key] = this.makeNodeValue(val, key, `${id}.${key}`, id);
          }
        }
      }

      const node = {
        type: "value",
        name,
        id,
        parentId,
        value: nodeValue,
      };
      this.nodeMap.set(id, node);
      return node;
    },

    onValueChanged({ id, value }) {
      if (typeof value === "string") {
        value = value.replaceAll("'", '"');
      }

      const node = this.getNodeById(id);
      if (node === null) {
        return;
      }

      if (node.stateKey !== undefined) {
        this.store.set(node.stateKey, structuredClone(value));
      } else {
        let parentNode = this.getNodeById(node.parentId);
        while (parentNode !== null) {
          const parentValue = getNodeValue(parentNode);
          parentValue[node.name] = value;

          if (parentNode.stateKey !== undefined) {
            this.store.set(
              parentNode.stateKey,
              structuredClone(parentValue)
            );
            return;
          }

          parentNode = this.getNodeById(parentNode.parentId);
        }
      }
    },
  },
};

import { nextTick } from "vue";
import { getNodeValue, nodeMatchesFilter } from "../helper.js";

export default {
  name: "DiffNode",
  props: [
    "node",
    "depth",
    "expanded",
    "toggle",
    "isExpanded",
    "classFor",
    "filter",
  ],

  data() {
    return {
      editing: false,
      editValue: '',
    }
  },

  computed: {
    // Children that pass the current filter. A child is kept if its own
    // name matches or any descendant matches, so the path to a matching
    // leaf stays visible. Without a filter, the raw children pass through.
    visibleChildren() {
      const children = this.node.value;

      if (!this.filter || children === null || typeof children !== "object") {
        return children;
      }

      const q = this.filter.trim().toLowerCase();
      if (!q) {
        return children;
      }

      // If this node's own name matches the filter, the user is looking
      // for this node — show all its children so it stays expandable,
      // rather than filtering them down and possibly ending up empty.
      if (String(this.node.name).toLowerCase().includes(q)) {
        return children;
      }

      // Otherwise, keep only children whose name (or a descendant's name)
      // matches, so the path toward a matching leaf stays visible.
      if (Array.isArray(children)) {
        return children.filter(
          (child) => child && nodeMatchesFilter(child, q)
        );
      }

      const result = {};
      for (const [key, child] of Object.entries(children)) {
        if (child && nodeMatchesFilter(child, q)) {
          result[key] = child;
        }
      }
      return result;
    },

    hasVisibleChildren() {
      const children = this.visibleChildren;
      if (children === null || typeof children !== "object") {
        return false;
      }
      return Array.isArray(children)
        ? children.length > 0
        : Object.keys(children).length > 0;
    },
  },

  methods: {
    open() {
      return this.isExpanded(this.node.id);
    },

    expandable() {
      return this.hasVisibleChildren;
    },

    isContainer() {
      return (
        this.node.type === "value" &&
        this.node.value !== null &&
        typeof(this.node.value) === "object"
      );
    },

    entries(node) {
      if (Array.isArray(node)) {
        return node.map((v, i) => [i, v]);
      }
      return Object.entries(node);
    },

    label() {
      const idx = this.path.lastIndexOf(".");
      return idx === -1 ? this.path : this.path.slice(idx + 1);
    },

    isLeaf(node) {
      return node === null || typeof node !== "object";
    },

    leafLabel(value) {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      if (typeof value === "string") return `"${value}"`;
      return String(value);
    },

    previewLabel(value) {
      if (Array.isArray(value)) {
        return `Array(${value.length})`;
      }
      return `Object(${Object.keys(value).length})`;
    },

    leafType(value) {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      return typeof value;
    },

    async onDoubleClick() {
      this.editing = true;
      this.editValue = JSON.stringify(getNodeValue(this.node));
      await nextTick();
      this.$refs.editor.focus();
    },

    validateEdit() {
      this.editing = false;
      this.$emit('valueChanged', { id: this.node.id, value: JSON.parse(this.editValue) });
    },

    cancelEdit() {
      this.editing = false;
    },
  },
};

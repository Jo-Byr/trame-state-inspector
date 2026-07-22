import { nextTick } from "vue";
import { getNodeValue } from "../helper.js";

export default {
  name:"DiffNode",
  props:[
    "node",
    "depth",
    "expanded",
    "toggle",
    "isExpanded",
    "classFor"
  ],

  data() {
    return {
      editing: false,
      editValue: '',
    }
  },

  methods: {
    open(){
      return this.isExpanded(this.node.id);
    },

    expandable() {
      return (
        (this.node.type == 'namespace' && Object.keys(this.node.value).length > 0) ||
        (typeof(this.node.value) === 'object' && Object.keys(this.node.value).length > 0)
      );
    },

    isContainer() {
      return (
        this.node.type === "value" &&
        this.node.value !== null &&
        typeof(this.node.value) === "object"
      );
    },

    entries(node){
      if(Array.isArray(node))
        return node.map(
          (v,i)=>[i,v]
        );

      return Object.entries(node);
    },

    // The last segment of a dotted path is the key/index this node was
    // reached by - used as its display label.
    label(){
      const idx = this.path.lastIndexOf(".");
      return idx === -1 ? this.path : this.path.slice(idx + 1);
    },

    isLeaf(node){
      // Nodes are raw state values now (no more {type,data} diff
      // wrapper) - anything that isn't a plain object/array is a leaf.
      return node === null || typeof node !== "object";
    },

    leafLabel(value){
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

    // Used to color-code the value column by type, the way browser
    // consoles do (strings/numbers/booleans/null read faster that way).
    leafType(value){
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      return typeof value;
    },

    async onDoubleClick(){
      this.editing = true;
      this.editValue = JSON.stringify(getNodeValue(this.node));
      await nextTick();
      this.$refs.editor.focus();
    },

    validateEdit(){
      this.editing = false;
      this.$emit('valueChanged', {id: this.node.id, value: JSON.parse(this.editValue)});
    },

    cancelEdit() {
      this.editing = false;
    }
  }
};

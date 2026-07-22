function setTrameState(key, value) {
  chrome.runtime.sendMessage({
    type: "TRAME_STATE_SET",
    key,
    value: JSON.parse(value)
  });
}

export default {
  name:"DiffNode",
  props:[
    "node",
    "path",
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
      return this.isExpanded(this.path);
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

    leafLabel(node){
      if (node === null) return "null";
      if (node === undefined) return "undefined";
      if (typeof node === "string") return `"${node}"`;
      return String(node);
    },

    entries(node){
      if(Array.isArray(node))
        return node.map(
          (v,i)=>[i,v]
        );

      return Object.entries(node);
    },

    // Kept out of the template: a literal `{${...}}` inside a mustache
    // produces a `}}` sequence the compiler misreads as its own closing
    // delimiter.
    previewLabel(node){
      return Array.isArray(node)
        ? "Array(" + node.length + ")"
        : "Object(" + Object.keys(node).length + ")";
    },

    // Used to color-code the value column by type, the way browser
    // consoles do (strings/numbers/booleans/null read faster that way).
    leafType(node){
      if (node === null) return "null";
      if (node === undefined) return "undefined";
      return typeof node;
    },

    onDoubleClick(event) {
      this.editing = true;
      this.editValue = this.node;
    },

    validateEdit() {
      this.editing = false;
      setTrameState(this.path, this.editValue);
    },

    cancelEdit() {
      this.editing = false;
    }
  }
};

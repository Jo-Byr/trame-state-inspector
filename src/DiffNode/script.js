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

    // Kept out of the template: `{${Object.keys(node).length}}` inside a
    // mustache produces a `}}` sequence the compiler misreads as the
    // mustache's own closing delimiter.
    countLabel(node){
      return Array.isArray(node)
        ? "[" + node.length + "]"
        : "{" + Object.keys(node).length + "}";
    }
  }
};

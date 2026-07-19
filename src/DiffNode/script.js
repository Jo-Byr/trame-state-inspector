export default {
  name:"DiffNode",
  props:[
    "node",
    "name",
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

    isLeaf(node){
      return node &&
        typeof node==="object" &&
        "type" in node &&
        "data" in node;
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

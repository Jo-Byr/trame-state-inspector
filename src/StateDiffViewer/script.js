import DiffNode from "../DiffNode/index.vue";

const deepDiffMapper = function () {
  return {
    VALUE_CREATED: 'created',
    VALUE_UPDATED: 'updated',
    VALUE_DELETED: 'deleted',
    VALUE_UNCHANGED: 'unchanged',
    map: function(obj1, obj2) {
      if (this.isFunction(obj1) || this.isFunction(obj2)) {
        throw 'Invalid argument. Function given, object expected.';
      }
      if (this.isValue(obj1) || this.isValue(obj2) || Object.prototype.toString.call(obj1) !== Object.prototype.toString.call(obj2)) {
        return {
          type: this.compareValues(obj1, obj2),
          data: obj1 === undefined ? obj2 : obj1
        };
      }

      if (this.isArray(obj1)) {
        var diff = [];
        for (var i = 0; i < Math.max(obj1.length, obj2.length); i++) {
            diff.push(this.map(obj1[i], obj2[i]));
        }
        return diff;
      }

      var diff = {};
      for (var key in obj1) {
        if (this.isFunction(obj1[key])) {
          continue;
        }

        var value2 = undefined;
        if (obj2[key] !== undefined) {
          value2 = obj2[key];
        }

        diff[key] = this.map(obj1[key], value2);
      }
      for (var key in obj2) {
        if (this.isFunction(obj2[key]) || diff[key] !== undefined) {
          continue;
        }

        diff[key] = this.map(undefined, obj2[key]);
      }

      return diff;

    },
    compareValues: function (value1, value2) {
      if (value1 === value2) {
        return this.VALUE_UNCHANGED;
      }
      if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
        return this.VALUE_UNCHANGED;
      }
      if (value1 === undefined) {
        return this.VALUE_CREATED;
      }
      if (value2 === undefined) {
        return this.VALUE_DELETED;
      }
      return this.VALUE_UPDATED;
    },
    isFunction: function (x) {
      return Object.prototype.toString.call(x) === '[object Function]';
    },
    isArray: function (x) {
      return Object.prototype.toString.call(x) === '[object Array]';
    },
    isDate: function (x) {
      return Object.prototype.toString.call(x) === '[object Date]';
    },
    isObject: function (x) {
      return Object.prototype.toString.call(x) === '[object Object]';
    },
    isValue: function (x) {
      return !this.isObject(x) && !this.isArray(x);
    }
  }
}();

// Walks a diffTree produced by deepDiffMapper.map and records the diff
// type of every leaf under its dotted path, so classFor() can look
// changes up in O(1) instead of re-walking the tree per node.
function collectChanges(node, path, map) {
  if (node && typeof node === "object" && "type" in node && "data" in node) {
    map.set(path, node.type);
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((child, i) =>
      collectChanges(child, path ? `${path}.${i}` : `${i}`, map)
    );
    return;
  }

  if (node && typeof node === "object") {
    for (const key in node) {
      collectChanges(node[key], path ? `${path}.${key}` : key, map);
    }
  }
}

export default {
  name: "StateDiffViewer",
  components: {
    DiffNode
  },

  props: {
    state: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      previousState: null,
      diffTree: {},
      expanded:new Set(),
      highlights:new Map()
    };
  },

  watch: {
    state: {
      handler(newState) {
        if (!newState) return;

        const current = JSON.parse(JSON.stringify(newState));

        this.diffTree = deepDiffMapper.map(
          this.previousState ?? current,
          current
        );

        const highlights = new Map();
        collectChanges(this.diffTree, "", highlights);
        this.highlights = highlights;

        this.previousState = current;
      },
      immediate: true,
      deep: true
    }
  },

  methods: {
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

    classFor(path){
      const type = this.highlights.get(path);
      return type && type !== deepDiffMapper.VALUE_UNCHANGED
        ? `diff-${type}`
        : "";
    }
  }
};

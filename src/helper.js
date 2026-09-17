export function getNodeValue(node) {
  const value = node.value;
  if (typeof(value) === 'object' && value !== undefined && value !== null) {
    if (Array.isArray(value)) {
      return value.map((val) => getNodeValue(val));
    } else {
      const ret = {};
      for (const [key, val] of Object.entries(value)) {
        ret[key] = getNodeValue(val);
      }
      return ret;
    }
  }
  return value;
}

// Recursively check whether a node's own name or any descendant's name
// contains `query` (already lowercased). Used for filtering the tree.
export function nodeMatchesFilter(node, query) {
  if (String(node.name).toLowerCase().includes(query)) {
    return true;
  }

  const value = node.value;
  if (value === null || typeof value !== "object") {
    return false;
  }

  const children = Array.isArray(value) ? value : Object.values(value);
  return children.some((child) => nodeMatchesFilter(child, query));
}

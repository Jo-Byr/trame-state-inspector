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

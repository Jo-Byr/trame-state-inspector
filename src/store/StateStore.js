export default class StateStore {
  constructor(sendMessage) {
    this.state = {};

    this.lastDiff = {
      created: {},
      updated: {},
      deleted: [],
    };

    // Bumped on every mutation. The viewer watches this to rebuild its
    // tree from `state` — the source of truth — instead of accumulating
    // diffs. This is what makes tab switches refresh the display.
    this.version = 0;

    this.sendMessage = sendMessage;
  }

  reset() {
    this.load({}, { created: {}, updated: {}, deleted: [] });
  }

  // Replace the whole state at once (used on tab switch).
  load(state, lastDiff) {
    for (const key of Object.keys(this.state)) {
      delete this.state[key];
    }

    Object.assign(this.state, state);
    this.lastDiff = lastDiff;
    this.version++;
  }

  applyDiff(diff) {
    if (!diff) {
      return;
    }

    this.lastDiff = diff;

    for (const [key, value] of Object.entries(diff.created ?? {})) {
      this.state[key] = value;
    }

    for (const [key, value] of Object.entries(diff.updated ?? {})) {
      this.state[key] = value;
    }

    for (const key of diff.deleted ?? []) {
      delete this.state[key];
    }

    this.version++;
  }

  set(key, value) {
    this.sendMessage({
      type: "TRAME_STATE_SET",
      key,
      value,
    });
  }

  get(key) { return this.state[key]; }
  has(key) { return Object.prototype.hasOwnProperty.call(this.state, key); }
  keys() { return Object.keys(this.state); }
  values() { return Object.values(this.state); }
  entries() { return Object.entries(this.state); }
  toJSON() { return this.state; }
}

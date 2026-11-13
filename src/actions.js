// Registry so world modules can trigger UI without importing it (avoids cycles).
export const actions = {};
export const act = (name, ...args) => () => actions[name]?.(...args);

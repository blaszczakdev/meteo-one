const byId = (id) => document.getElementById(id);

export const mapListToDOMElements = (ids) => {
  const out = {};
  for (const id of ids) out[id] = byId(id);
  return out;
};

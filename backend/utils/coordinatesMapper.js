function applyCoordinates(fields, mappings) {
  return Object.entries(fields).map(([key, value]) => ({
    key,
    value,
    x: mappings[key]?.x ?? 40,
    y: mappings[key]?.y ?? 40,
    rotate: mappings[key]?.rotate ?? 0,
    fontSize: mappings[key]?.fontSize
  }));
}

module.exports = {
  applyCoordinates
};

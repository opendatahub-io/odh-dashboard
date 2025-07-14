const merge = (a, b) => {
  const result = { ...a };

  for (const key in b) {
    if (Object.prototype.hasOwnProperty.call(b, key)) {
      if (key in result) {
        const aValue = result[key];
        const bValue = b[key];

        // If both are arrays, spread both
        if (Array.isArray(aValue) && Array.isArray(bValue)) {
          result[key] = [...aValue, ...bValue];
        }
        // If both are objects (and not arrays), spread both
        else if (
          typeof aValue === 'object' &&
          typeof bValue === 'object' &&
          aValue !== null &&
          bValue !== null &&
          !Array.isArray(aValue) &&
          !Array.isArray(bValue)
        ) {
          result[key] = { ...aValue, ...bValue };
        }
        // Otherwise, b's value overwrites a's value
        else {
          result[key] = bValue;
        }
      } else {
        result[key] = b[key];
      }
    }
  }

  return result;
};

module.exports = {
  merge,
};

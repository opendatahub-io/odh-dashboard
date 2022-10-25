export const updateArrayValue = <T>(values: T[], index: number, partialValue: Partial<T>): T[] =>
  values.map((v, i) => (i === index ? { ...v, ...partialValue } : v));

export const removeArrayItem = <T>(values: T[], index: number): T[] =>
  values.filter((v, i) => i !== index);

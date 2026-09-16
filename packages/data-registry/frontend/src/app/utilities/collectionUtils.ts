export const parseCollectionDescription = (
  properties: Record<string, string>,
  project: string,
  collection: string,
): string => {
  const nsKey = `_ns_${project}_${collection}`;
  if (properties[nsKey]) {
    try {
      const nsData = JSON.parse(properties[nsKey]);
      return nsData.description || '';
    } catch {
      return properties.description || '';
    }
  }
  return properties.description || '';
};

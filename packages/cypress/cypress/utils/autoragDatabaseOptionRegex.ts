export const getExactDatabaseOptionRegex = (name: string): RegExp => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`^${escapedName}(?:\\s*(?:Milvus|PGVector|Neo4j))?$`, 'i');
};

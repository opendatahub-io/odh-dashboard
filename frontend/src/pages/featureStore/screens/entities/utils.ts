import { Entity, EntityRelationship } from '#~/pages/featureStore/types/entities';

/**
 * Filters relationships for a specific entity by target type
 * @param relationships - The relationships object from EntityList
 * @param entityKey - The key of the entity (e.g., 'driver', 'zipcode')
 * @param targetType - The type to filter by (e.g., 'featureService', 'featureView', 'dataSource')
 * @returns Array of relationships that match the target type
 */
export const getRelationshipsByTargetType = (
  relationships: Record<string, EntityRelationship[]>,
  entityKey: string,
  targetType: string,
): EntityRelationship[] => {
  const entityRelationships = relationships[entityKey];
  return entityRelationships.filter((relationship) => relationship.target.type === targetType);
};

// Type guard to check if value is a record of strings
const isRecordOfStrings = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((v) => typeof v === 'string');

// Type guard to check if value is a record
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Helper function to get nested values from objects
export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const keys = path.split('.');
  let result: unknown = obj;
  for (const key of keys) {
    if (result && isRecord(result) && key in result) {
      result = result[key];
    } else {
      return undefined;
    }
  }
  return result;
};

export const entityTableFilterKeyMapping: Record<string, string> = {
  entity: 'spec.name',
  joinKey: 'spec.joinKey',
  valueType: 'spec.valueType',
  owner: 'spec.owner',
  project: 'project',
  tag: 'spec.tags',
  featureViews: 'featureViews',
};

// Individual filter functions
const filterByTags = (entity: Entity, filterString: string): boolean => {
  const entityValue = getNestedValue(entity, 'spec.tags');
  if (!entityValue || !isRecordOfStrings(entityValue)) {
    return false;
  }

  return Object.entries(entityValue).some(
    ([tagKey, tagValue]) =>
      tagKey.toLowerCase().includes(filterString.toLowerCase()) ||
      tagValue.toLowerCase().includes(filterString.toLowerCase()),
  );
};

const filterByFeatureViews = (
  entity: Entity,
  relationships: Record<string, EntityRelationship[]>,
  filterString: string,
): boolean => {
  const entityKey = entity.spec.name;
  const featureViews = getRelationshipsByTargetType(relationships, entityKey, 'featureView');

  return featureViews.some((fv) =>
    fv.target.name.toLowerCase().includes(filterString.toLowerCase()),
  );
};

const filterByProperty = (entity: Entity, propertyPath: string, filterString: string): boolean => {
  const entityValue = getNestedValue(entity, propertyPath);

  return String(entityValue || '')
    .toLowerCase()
    .includes(filterString.toLowerCase());
};

/**
 * Applies filters to entities based on filter data
 * @param entities - Array of entities to filter
 * @param relationships - Relationships object for feature view filtering
 * @param filterData - Filter data object
 * @returns Filtered array of entities
 */
export const applyEntityFilters = (
  entities: Entity[],
  relationships: Record<string, EntityRelationship[]>,
  filterData: Record<string, string | { label: string; value: string } | undefined>,
): Entity[] =>
  entities.filter((entity) =>
    Object.entries(filterData).every(([key, filterValue]) => {
      if (!filterValue) {
        return true; // Case1: No filter applied
      }

      const propertyPath = entityTableFilterKeyMapping[key];
      if (!propertyPath) {
        return true; // Case2: Unknown filter key
      }

      const filterString = typeof filterValue === 'string' ? filterValue : filterValue.value;

      // Case3:Apply the appropriate filter based on property path
      if (propertyPath === 'featureViews') {
        return filterByFeatureViews(entity, relationships, filterString);
      }

      if (propertyPath === 'spec.tags') {
        return filterByTags(entity, filterString);
      }

      return filterByProperty(entity, propertyPath, filterString);
    }),
  );

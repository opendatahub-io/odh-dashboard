/**
 * Generic filtering utilities for Feature Store components
 * This provides a reusable template for filtering different types of feature store objects
 */

export interface FilterableItem {
  spec: {
    name: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GenericRelationship {
  source: {
    name: string;
    type: string;
  };
  target: {
    name: string;
    type: string;
  };
}

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
  if (!path) {
    return obj;
  }
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

/**
 * Filters relationships for a specific item by target type
 */
export const getRelationshipsByTargetType = <T extends GenericRelationship>(
  relationships: Record<string, T[] | undefined>,
  itemKey: string,
  targetType: string,
): T[] => {
  const itemRelationships = relationships[itemKey];
  return itemRelationships?.filter((relationship) => relationship.target.type === targetType) || [];
};

/**
 * Generic filter functions that can be reused across different feature store components
 */
export class FeatureStoreFilterUtils<T extends FilterableItem, R extends GenericRelationship> {
  private filterKeyMapping: Record<string, string>;

  constructor(filterKeyMapping: Record<string, string>) {
    this.filterKeyMapping = filterKeyMapping;
  }

  /**
   * Filter by tags - searches both tag keys and values
   */
  private filterByTags = (item: T, filterString: string): boolean => {
    const itemValue = getNestedValue(item, 'spec.tags');
    if (!itemValue || !isRecordOfStrings(itemValue)) {
      return false;
    }

    return Object.entries(itemValue).some(
      ([tagKey, tagValue]) =>
        tagKey.toLowerCase().includes(filterString.toLowerCase()) ||
        tagValue.toLowerCase().includes(filterString.toLowerCase()),
    );
  };

  /**
   * Filter by feature views - searches related feature view names
   */
  private filterByFeatureViews = (
    item: T,
    relationships: Record<string, R[]>,
    filterString: string,
  ): boolean => {
    const itemKey = item.spec.name;
    const featureViews = getRelationshipsByTargetType(relationships, itemKey, 'featureView');

    return featureViews.some((fv) =>
      fv.target.name.toLowerCase().includes(filterString.toLowerCase()),
    );
  };

  /**
   * Filter by a specific property path
   */
  private filterByProperty = (item: T, propertyPath: string, filterString: string): boolean => {
    const itemValue = getNestedValue(item, propertyPath);

    return String(itemValue || '')
      .toLowerCase()
      .includes(filterString.toLowerCase());
  };

  /**
   * Apply all filters to an array of items
   */
  public applyFilters = (
    items: T[],
    relationships: Record<string, R[]>,
    filterData: Record<string, string | { label: string; value: string } | undefined>,
  ): T[] =>
    items.filter((item) =>
      Object.entries(filterData).every(([key, filterValue]) => {
        if (!filterValue) {
          return true; // No filter applied
        }

        const propertyPath = this.filterKeyMapping[key];
        if (!propertyPath) {
          return true; // Unknown filter key
        }

        const filterString = typeof filterValue === 'string' ? filterValue : filterValue.value;

        // Apply the appropriate filter based on property path
        if (propertyPath === 'featureViews') {
          return this.filterByFeatureViews(item, relationships, filterString);
        }

        if (propertyPath === 'spec.tags') {
          return this.filterByTags(item, filterString);
        }

        return this.filterByProperty(item, propertyPath, filterString);
      }),
    );
}

/**
 * Factory function to create filter utilities for specific types
 */
export const createFeatureStoreFilterUtils = <
  T extends FilterableItem,
  R extends GenericRelationship,
>(
  filterKeyMapping: Record<string, string>,
) => new FeatureStoreFilterUtils<T, R>(filterKeyMapping);

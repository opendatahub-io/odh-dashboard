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

// Type guard to check if value is a string
const isString = (value: unknown): value is string => typeof value === 'string';

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
export class FeatureStoreFilterUtils<
  T extends Record<string, unknown>,
  R extends GenericRelationship,
> {
  private filterKeyMapping: Record<string, string>;

  private namePath: string;

  private tagsPath: string;

  constructor(
    filterKeyMapping: Record<string, string>,
    namePath = 'spec.name',
    tagsPath = 'spec.tags',
  ) {
    this.filterKeyMapping = filterKeyMapping;
    this.namePath = namePath;
    this.tagsPath = tagsPath;
  }

  /**
   * Filter by tags - searches both tag keys and values
   */
  private filterByTags = (item: T, filterString: string): boolean => {
    const itemValue = getNestedValue(item, this.tagsPath);
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
    relationships: Record<string, R[] | undefined>,
    filterString: string,
  ): boolean => {
    const itemKey = getNestedValue(item, this.namePath);
    if (!isString(itemKey)) {
      return false;
    }

    const itemRelationships = relationships[itemKey];
    if (!itemRelationships) {
      return false;
    }

    // Check both source and target for featureView relationships
    return itemRelationships.some((rel) => {
      // Check the feature view name (could be in source or target)
      const featureViewName = rel.source.type === 'featureView' ? rel.source.name : rel.target.name;

      return (
        (rel.source.type === 'featureView' || rel.target.type === 'featureView') &&
        featureViewName.toLowerCase().includes(filterString.toLowerCase())
      );
    });
  };

  /**
   * Filter by features - searches through feature names in the features array
   */
  private filterByFeatures = (item: T, filterString: string): boolean => {
    const features = getNestedValue(item, 'spec.features');
    if (!Array.isArray(features)) {
      return false;
    }

    return features.some((feature: Record<string, unknown>) => {
      const featureName = feature.name;
      return (
        typeof featureName === 'string' &&
        featureName.toLowerCase().includes(filterString.toLowerCase())
      );
    });
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
    relationships: Record<string, R[] | undefined>,
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

        if (propertyPath === 'features') {
          return this.filterByFeatures(item, filterString);
        }

        if (propertyPath === this.tagsPath) {
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
  T extends Record<string, unknown>,
  R extends GenericRelationship,
>(
  filterKeyMapping: Record<string, string>,
  namePath?: string,
  tagsPath?: string,
): FeatureStoreFilterUtils<T, R> =>
  new FeatureStoreFilterUtils<T, R>(filterKeyMapping, namePath, tagsPath);

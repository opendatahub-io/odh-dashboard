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
   * Filter by tags - searches both tag keys and values, and also exact tag string matches
   */
  private filterByTags = (item: T, filterString: string): boolean => {
    const itemValue = getNestedValue(item, this.tagsPath);
    if (!itemValue || !isRecordOfStrings(itemValue)) {
      return false;
    }

    const normalizedFilterString = filterString.trim();
    const tagEntries = Object.entries(itemValue);

    // Check for exact tag string match (key=value format)
    const hasExactMatch = tagEntries.some(
      ([tagKey, tagValue]) => `${tagKey}=${tagValue}` === normalizedFilterString,
    );
    if (hasExactMatch) {
      return true;
    }

    const searchPattern = this.getTagSearchPattern(normalizedFilterString);

    switch (searchPattern.type) {
      case 'prefix': {
        const { key } = searchPattern;
        if (!key) {
          return false;
        }
        return tagEntries.some(([tagKey]) => tagKey.toLowerCase() === key.toLowerCase());
      }

      case 'partial': {
        const { key, value } = searchPattern;
        if (!key || !value) {
          return false;
        }
        return tagEntries.some(([tagKey, tagValue]) => {
          const keyMatches = tagKey.toLowerCase() === key.toLowerCase();
          const valueMatches = tagValue.toLowerCase().includes(value.toLowerCase());
          return keyMatches && valueMatches;
        });
      }

      case 'general':
        return tagEntries.some(
          ([tagKey, tagValue]) =>
            tagKey.toLowerCase().includes(normalizedFilterString.toLowerCase()) ||
            tagValue.toLowerCase().includes(normalizedFilterString.toLowerCase()),
        );

      default:
        return false;
    }
  };

  /**
   * Determine the type of tag search pattern
   */
  private getTagSearchPattern(filterString: string): {
    type: 'prefix' | 'partial' | 'general';
    key?: string;
    value?: string;
  } {
    // Pattern 1: "key=" (prefix search - matches all tags with that key)
    const prefixPattern = /^([^=]+)=$/;
    const prefixMatch = filterString.match(prefixPattern);
    if (prefixMatch) {
      return {
        type: 'prefix',
        key: prefixMatch[1].trim(),
      };
    }

    // Pattern 2: "key=partial_value" (partial tag match)
    const partialPattern = /^([^=]+)=(.+)$/;
    const partialMatch = filterString.match(partialPattern);
    if (partialMatch) {
      return {
        type: 'partial',
        key: partialMatch[1].trim(),
        value: partialMatch[2].trim(),
      };
    }

    // Pattern 3: General search (partial matching on keys and values)
    return {
      type: 'general',
    };
  }

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
   * Filter by date - checks if the item's date is after the filter date
   */
  private filterByDate = (item: T, propertyPath: string, filterString: string): boolean => {
    const itemValue = getNestedValue(item, propertyPath);
    if (!itemValue) {
      return false;
    }

    const filterDate = new Date(filterString);
    if (Number.isNaN(filterDate.getTime())) {
      return false;
    }

    const itemDate = new Date(String(itemValue));
    if (Number.isNaN(itemDate.getTime())) {
      return false;
    }

    return itemDate >= filterDate;
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

        if (key === 'created' || key === 'updated') {
          return this.filterByDate(item, propertyPath, filterString);
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

/**
 * Applies tag filters to a list of items that have a spec.tags property
 *
 * @param items - Array of items to filter
 * @param tagFilters - Array of tag filters in format "key=value"
 * @returns Filtered array of items that match all tag filters
 */
export const applyTagFilters = <T extends { spec: { tags?: Record<string, string> } }>(
  items: T[],
  tagFilters: string[],
): T[] => {
  if (tagFilters.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const itemTags = item.spec.tags || {};
    return tagFilters.every((tagFilter) => {
      const tagEntries = Object.entries(itemTags);
      return tagEntries.some(([key, value]) => `${key}=${value}` === tagFilter);
    });
  });
};

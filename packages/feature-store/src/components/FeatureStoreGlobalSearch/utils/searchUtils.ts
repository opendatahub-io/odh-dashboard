import {
  featureEntityRoute,
  featureDataSourceRoute,
  featureViewRoute,
  featureServiceRoute,
  featureStoreRootRoute,
} from '../../../routes';
import type { ISearchItem } from '../hooks/useSearchHandlers';

export const getFeatureStoreRoute = (type: string, project: string, name: string): string => {
  switch (type) {
    case 'entity':
      return featureEntityRoute(name, project);
    case 'dataSource':
      return featureDataSourceRoute(name, project);
    case 'feature':
      return `${featureStoreRootRoute()}/features/${project}`;
    case 'featureView':
      return featureViewRoute(name, project);
    case 'featureService':
      return featureServiceRoute(name, project);
    default:
      return `/develop-train/feature-store/${project}`;
  }
};

export const groupResultsByCategory = (
  results: ISearchItem[],
): Array<{ category: string; items: ISearchItem[] }> => {
  const groups: { [category: string]: ISearchItem[] } = {};

  results.forEach((item) => {
    const { category } = item;
    if (!(category in groups)) {
      groups[category] = [];
    }
    groups[category].push(item);
  });

  const groupedResults = Object.keys(groups).map((category) => ({
    category,
    items: groups[category],
  }));

  return groupedResults;
};

import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ModelRegistryBase, ModelVersion } from '~/concepts/modelRegistry/types';

//Retrieves the labels from customProperties that have non-empty string_value.
export const getLabels = <T extends ModelRegistryBase['customProperties']>(
  customProperties: T,
): string[] =>
  Object.keys(customProperties).filter((key) => customProperties[key].string_value === '');

export const filteredmodelVersions = (
  unfilteredmodelVersions: ModelVersion[],
  search: string,
  searchType: SearchType,
): ModelVersion[] =>
  unfilteredmodelVersions.filter((mv: ModelVersion) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.KEYWORD:
        return (
          mv.name.toLowerCase().includes(search.toLowerCase()) ||
          (mv.description && mv.description.toLowerCase().includes(search.toLowerCase()))
        );

      case SearchType.OWNER:
        return (
          mv.author &&
          (mv.author.toLowerCase().includes(search.toLowerCase()) ||
            (mv.author && mv.author.toLowerCase().includes(search.toLowerCase())))
        );

      default:
        return true;
    }
  });

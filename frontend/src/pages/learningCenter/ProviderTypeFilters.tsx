import * as React from 'react';
import { useHistory } from 'react-router';
import { OdhDocument } from '../../types';
import { FilterSidePanelCategory } from '@patternfly/react-catalog-view-extension';
import FilterSidePanelCategoryItem from '../../components/FilterSidePanelCategoryItem';
import { removeQueryArgument, setQueryArgument } from '../../utilities/router';
import { PROVIDER_TYPE_FILTER_KEY } from './const';
import { useQueryFilters } from './useQueryFilters';
import { ODH_PRODUCT_NAME } from 'utilities/const';

type ProviderTypeFiltersProps = {
  docApps: OdhDocument[];
  categoryApps: OdhDocument[];
};

const ProviderTypeFilters: React.FC<ProviderTypeFiltersProps> = ({ docApps, categoryApps }) => {
  const history = useHistory();
  const providerTypeFilters = useQueryFilters(PROVIDER_TYPE_FILTER_KEY);
  const [showAll, setShowAll] = React.useState<boolean>(false);

  const providerTypes = React.useMemo(() => {
    const allTypes = {};
    docApps.forEach((docApp) => {
      if (!docApp.spec.appCategory) {
        return;
      }
      allTypes[docApp.spec.appCategory] = 0;
    });
    categoryApps.forEach((categoryApp) => {
      if (!categoryApp.spec.appCategory) {
        return;
      }
      if (!allTypes[categoryApp.spec.appCategory]) {
        allTypes[categoryApp.spec.appCategory] = 1;
        return;
      }
      allTypes[categoryApp.spec.appCategory]++;
    });
    return allTypes;
  }, [categoryApps, docApps]);

  const onFilterChange = (docType: string, e: React.SyntheticEvent<HTMLElement>): void => {
    const checked = (e.target as React.AllHTMLAttributes<HTMLInputElement>).checked;
    const updatedQuery = [...providerTypeFilters];
    const index = updatedQuery.indexOf(docType);
    if (checked && index === -1) {
      updatedQuery.push(docType);
    }
    if (!checked && index !== -1) {
      updatedQuery.splice(index, 1);
    }

    if (!updatedQuery.length) {
      removeQueryArgument(history, PROVIDER_TYPE_FILTER_KEY);
      return;
    }
    setQueryArgument(history, PROVIDER_TYPE_FILTER_KEY, JSON.stringify(updatedQuery));
  };

  if (!Object.keys(providerTypes).length) {
    return null;
  }

  return (
    <FilterSidePanelCategory
      key="provider-type-filter"
      title="Provider Type"
      onShowAllToggle={() => setShowAll(!showAll)}
      showAll={showAll}
    >
      {Object.keys(providerTypes)
        .sort((a, b) => {
          if (a.toLowerCase().includes(`${ODH_PRODUCT_NAME}`)) {
            return -1;
          }
          return a.localeCompare(b);
        })
        .map((providerType) => {
          return (
            <FilterSidePanelCategoryItem
              id={providerType}
              key={providerType}
              checked={providerTypeFilters.includes(providerType)}
              onClick={(e) => onFilterChange(providerType, e)}
              title={providerType}
            >
              {`${providerType} (${providerTypes[providerType]})`}
            </FilterSidePanelCategoryItem>
          );
        })}
    </FilterSidePanelCategory>
  );
};

export default ProviderTypeFilters;

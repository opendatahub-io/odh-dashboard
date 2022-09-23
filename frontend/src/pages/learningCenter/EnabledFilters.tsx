import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterSidePanelCategory } from '@patternfly/react-catalog-view-extension';
import FilterSidePanelCategoryItem from '../../components/FilterSidePanelCategoryItem';
import { OdhDocument } from '../../types';
import { removeQueryArgument, setQueryArgument } from '../../utilities/router';
import { ENABLED_FILTER_KEY } from './const';
import { useQueryFilters } from './useQueryFilters';

type EnabledFilterProps = {
  categoryApps: OdhDocument[];
};

const EnabledFilter: React.FC<EnabledFilterProps> = ({ categoryApps }) => {
  const navigate = useNavigate();
  const enabledFilters = useQueryFilters(ENABLED_FILTER_KEY);

  const enabledCount = React.useMemo(
    () => categoryApps.filter((app) => app.spec.appEnabled).length,
    [categoryApps],
  );
  const notEnabledCount = React.useMemo(
    () => categoryApps.filter((app) => !app.spec.appEnabled).length,
    [categoryApps],
  );

  const onFilterChange = (enabled: string, checked: boolean): void => {
    const updatedQuery = [...enabledFilters];
    const index = updatedQuery.indexOf(enabled);
    if (checked && index === -1) {
      updatedQuery.push(enabled);
    }
    if (!checked && index !== -1) {
      updatedQuery.splice(index, 1);
    }

    if (!updatedQuery.length) {
      removeQueryArgument(navigate, ENABLED_FILTER_KEY);
      return;
    }
    setQueryArgument(navigate, ENABLED_FILTER_KEY, JSON.stringify(updatedQuery));
  };

  return (
    <FilterSidePanelCategory key="enabled-filter" title="Enabled state">
      <FilterSidePanelCategoryItem
        data-id="enabled-filter-checkbox"
        id="enabled-filter-checkbox"
        checked={enabledFilters.includes('true')}
        onClick={(e) =>
          onFilterChange(
            'true',
            (e.target as React.AllHTMLAttributes<HTMLInputElement>).checked || false,
          )
        }
        title="Enabled"
      >
        {`Enabled (${enabledCount})`}
      </FilterSidePanelCategoryItem>
      <FilterSidePanelCategoryItem
        data-id="not-enabled-filter-checkbox"
        id="not-enabled-filter-checkbox"
        checked={enabledFilters.includes('false')}
        onClick={(e) =>
          onFilterChange(
            'false',
            (e.target as React.AllHTMLAttributes<HTMLInputElement>).checked || false,
          )
        }
        title="Not enabled"
      >
        {`Not enabled (${notEnabledCount})`}
      </FilterSidePanelCategoryItem>
    </FilterSidePanelCategory>
  );
};

export default EnabledFilter;

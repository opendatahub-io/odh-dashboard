import * as React from 'react';
import { useHistory } from 'react-router';
import { OdhDocument } from '../../types';
import { FilterSidePanelCategory } from '@patternfly/react-catalog-view-extension';
import FilterSidePanelCategoryItem from '../../components/FilterSidePanelCategoryItem';
import { removeQueryArgument, setQueryArgument } from '../../utilities/router';
import { APPLICATION_FILTER_KEY } from './const';
import { useQueryFilters } from './useQueryFilters';

type ApplicationFiltersProps = {
  docApps: OdhDocument[];
  categoryApps: OdhDocument[];
};

const ApplicationFilters: React.FC<ApplicationFiltersProps> = ({ docApps, categoryApps }) => {
  const history = useHistory();
  const providerFilters = useQueryFilters(APPLICATION_FILTER_KEY);
  const [showAll, setShowAll] = React.useState<boolean>(false);

  const applications = React.useMemo(() => {
    const allApplications = {};
    docApps.forEach((docApp) => {
      if (!docApp.spec.appDisplayName) {
        return;
      }
      allApplications[docApp.spec.appDisplayName] = 0;
    });
    categoryApps.forEach((categoryApp) => {
      if (!categoryApp.spec.appDisplayName) {
        return;
      }
      allApplications[categoryApp.spec.appDisplayName]++;
    });
    return allApplications;
  }, [categoryApps, docApps]);

  const onFilterChange = (docType: string, e: React.SyntheticEvent<HTMLElement>): void => {
    const checked = (e.target as React.AllHTMLAttributes<HTMLInputElement>).checked;
    const updatedQuery = [...providerFilters];
    const index = updatedQuery.indexOf(docType);
    if (checked && index === -1) {
      updatedQuery.push(docType);
    }
    if (!checked && index !== -1) {
      updatedQuery.splice(index, 1);
    }

    if (!updatedQuery.length) {
      removeQueryArgument(history, APPLICATION_FILTER_KEY);
      return;
    }
    setQueryArgument(history, APPLICATION_FILTER_KEY, JSON.stringify(updatedQuery));
  };

  if (!Object.keys(applications).length) {
    return null;
  }

  return (
    <FilterSidePanelCategory
      key="enabled-filter"
      title="Provider"
      onShowAllToggle={() => setShowAll(!showAll)}
      showAll={showAll}
    >
      {Object.keys(applications)
        .sort((a, b) => a.localeCompare(b))
        .map((application) => {
          return (
            <FilterSidePanelCategoryItem
              id={application}
              key={application}
              checked={providerFilters.includes(application)}
              onClick={(e) => onFilterChange(application, e)}
              title={application}
            >
              {`${application} (${applications[application]})`}
            </FilterSidePanelCategoryItem>
          );
        })}
    </FilterSidePanelCategory>
  );
};

export default ApplicationFilters;

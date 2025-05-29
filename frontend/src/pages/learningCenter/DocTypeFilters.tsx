import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterSidePanelCategory } from '@patternfly/react-catalog-view-extension';
import FilterSidePanelCategoryItem from '#~/components/FilterSidePanelCategoryItem';
import { OdhDocument, OdhDocumentType } from '#~/types';
import { removeQueryArgument, setQueryArgument } from '#~/utilities/router';
import { asEnumMember, enumIterator } from '#~/utilities/utils';
import { DOC_TYPE_FILTER_KEY } from './const';
import { useQueryFilters } from './useQueryFilters';

type DocTypeFiltersProps = {
  categoryApps: OdhDocument[];
};

const DocTypeFilters: React.FC<DocTypeFiltersProps> = ({ categoryApps }) => {
  const navigate = useNavigate();
  const docTypeFilters = useQueryFilters(DOC_TYPE_FILTER_KEY);
  const docCounts = React.useMemo(
    () =>
      categoryApps.reduce<{ [key in OdhDocumentType]: number }>(
        (acc, docApp) => {
          const enumMember = asEnumMember(docApp.spec.type, OdhDocumentType);
          if (enumMember) {
            acc[enumMember]++;
          }
          return acc;
        },
        {
          [OdhDocumentType.Documentation]: 0,
          [OdhDocumentType.HowTo]: 0,
          [OdhDocumentType.Tutorial]: 0,
          [OdhDocumentType.QuickStart]: 0,
        },
      ),
    [categoryApps],
  );

  const onFilterChange = (docType: string, checked: boolean): void => {
    const updatedQuery = [...docTypeFilters];
    const index = updatedQuery.indexOf(docType);
    if (checked && index === -1) {
      updatedQuery.push(docType);
    }
    if (!checked && index !== -1) {
      updatedQuery.splice(index, 1);
    }

    if (!updatedQuery.length) {
      removeQueryArgument(navigate, DOC_TYPE_FILTER_KEY);
      return;
    }
    setQueryArgument(navigate, DOC_TYPE_FILTER_KEY, JSON.stringify(updatedQuery));
  };

  return (
    <FilterSidePanelCategory key="enabled-filter" title="Resource type">
      {enumIterator(OdhDocumentType).map(([docType, value]) => (
        <FilterSidePanelCategoryItem
          data-id={value}
          id={value}
          key={value}
          checked={docTypeFilters.includes(value)}
          onChange={(_, checked) => onFilterChange(value, checked)}
          title={docType}
        >
          {`${docType} (${docCounts[value]})`}
        </FilterSidePanelCategoryItem>
      ))}
    </FilterSidePanelCategory>
  );
};

export default DocTypeFilters;

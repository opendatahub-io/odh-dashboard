import * as React from 'react';
import classNames from 'classnames';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { FilterSidePanel } from '@patternfly/react-catalog-view-extension';
import { TimesIcon } from '@patternfly/react-icons';
import { OdhDocument } from '#~/types';
import { useQueryParams } from '#~/utilities/useQueryParams';
import { matchesCategories } from '#~/utilities/utils';
import CategoryFilters from './CategoryFilters';
import EnabledFilters from './EnabledFilters';
import DocTypeFilters from './DocTypeFilters';
import { CATEGORY_FILTER_KEY } from './const';
import ApplicationFilters from './ApplicationFilters';
import ProviderTypeFilters from './ProviderTypeFilters';

type LearningCenterFilterProps = {
  docApps: OdhDocument[];
  favorites: string[];
  collapsible: boolean;
  collapsed: boolean;
  onCollapse: () => void;
};

const LearningCenterFilters: React.FC<LearningCenterFilterProps> = ({
  docApps,
  favorites,
  collapsible,
  collapsed,
  onCollapse,
}) => {
  const queryParams = useQueryParams();
  const category = queryParams.get(CATEGORY_FILTER_KEY) || '';
  const categoryApps = docApps.filter((odhDoc) => matchesCategories(odhDoc, category, favorites));
  const classes = classNames('odh-learning-paths__filter-panel', {
    'm-is-collapsible': collapsible,
    'm-is-collapsed': collapsed,
  });
  return (
    <div className={classes} data-testid="learning-center-filters">
      {collapsible ? (
        <Button
          icon={<TimesIcon />}
          className="odh-learning-paths__filter-panel__collapse-button"
          variant={ButtonVariant.plain}
          aria-label="Close filters"
          onClick={onCollapse}
        />
      ) : null}
      <CategoryFilters docApps={docApps} favorites={favorites} />
      <FilterSidePanel>
        <EnabledFilters categoryApps={categoryApps} />
        <DocTypeFilters categoryApps={categoryApps} />
        <ApplicationFilters docApps={docApps} categoryApps={categoryApps} />
        <ProviderTypeFilters docApps={docApps} categoryApps={categoryApps} />
      </FilterSidePanel>
    </div>
  );
};

export default LearningCenterFilters;

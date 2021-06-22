import * as React from 'react';
import classNames from 'classnames';
import { OdhDocument } from '../../types';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useQueryParams } from '../../utilities/useQueryParams';
import { matchesCategories } from '../../utilities/utils';
import CategoryFilters from './CategoryFilters';
import EnabledFilters from './EnabledFilters';
import DocTypeFilters from './DocTypeFilters';
import { CATEGORY_FILTER_KEY } from './const';
import ApplicationFilters from './ApplicationFilters';

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
    <div className={classes}>
      {collapsible ? (
        <Button
          className="odh-learning-paths__filter-panel__collapse-button"
          variant={ButtonVariant.plain}
          aria-label="Close filters"
          onClick={onCollapse}
        >
          <TimesIcon />
        </Button>
      ) : null}
      <CategoryFilters docApps={docApps} favorites={favorites} />
      <EnabledFilters categoryApps={categoryApps} />
      <DocTypeFilters categoryApps={categoryApps} />
      <ApplicationFilters docApps={docApps} categoryApps={categoryApps} />
    </div>
  );
};

export default LearningCenterFilters;

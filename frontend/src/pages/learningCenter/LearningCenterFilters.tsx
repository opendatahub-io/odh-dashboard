import * as React from 'react';
import { OdhDocument } from '../../types';
import { useQueryParams } from '../../utilities/useQueryParams';
import { matchesCategories } from '../../utilities/utils';
import CategoryFilters from './CategoryFilters';
import EnabledFilters from './EnabledFilters';
import DocTypeFilters from './DocTypeFilters';
import { CATEGORY_FILTER_KEY } from './const';
import ApplicationFilters from './ApplicationFilters';

type LearningCenterFilterProps = {
  docApps: OdhDocument[];
};

const LearningCenterFilters: React.FC<LearningCenterFilterProps> = ({ docApps }) => {
  const queryParams = useQueryParams();
  const category = queryParams.get(CATEGORY_FILTER_KEY) || '';
  const categoryApps = docApps.filter((odhDoc) => matchesCategories(odhDoc, category));

  return (
    <div className="odh-learning-paths__filter-panel">
      <CategoryFilters docApps={docApps} />
      <EnabledFilters categoryApps={categoryApps} />
      <DocTypeFilters categoryApps={categoryApps} />
      <ApplicationFilters docApps={docApps} categoryApps={categoryApps} />
    </div>
  );
};

export default LearningCenterFilters;

import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Truncate } from '@patternfly/react-core';

import { experimentsRootPath } from '~/routes';
import { useExperimentByParams } from './useExperimentByParams';

export const ExperimentRunsListBreadcrumb: React.FC = () => {
  const experiment = useExperimentByParams();

  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={experimentsRootPath}>Experiments</Link>
      </BreadcrumbItem>

      <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
        <Truncate content={experiment?.display_name || 'Loading...'} />
      </BreadcrumbItem>
    </Breadcrumb>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Label, Truncate } from '@patternfly/react-core';

import { experimentsRootPath } from '~/routes';
import { StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { ExperimentRunsContext } from '~/pages/pipelines/global/experiments/ExperimentRunsContext';

export const ExperimentRunsListBreadcrumb: React.FC = () => {
  const { experiment } = React.useContext(ExperimentRunsContext);

  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={experimentsRootPath}>Experiments</Link>
      </BreadcrumbItem>

      <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
        <Truncate content={experiment?.display_name || 'Loading...'} />
        {experiment?.storage_state === StorageStateKF.ARCHIVED && <Label>Archived</Label>}
      </BreadcrumbItem>
    </Breadcrumb>
  );
};

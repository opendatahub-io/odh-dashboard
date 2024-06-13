import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Label, Truncate } from '@patternfly/react-core';

import { experimentsRootPath } from '~/routes';
import { StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { ExperimentRunsContext } from '~/pages/pipelines/global/experiments/ExperimentRunsContext';

export const ExperimentRunsListBreadcrumb: React.FC = () => {
  const { experiment } = React.useContext(ExperimentRunsContext);

  const displayName = experiment?.display_name || 'Loading...';

  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={experimentsRootPath}>Experiments</Link>
      </BreadcrumbItem>

      <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
        {/* A hack solution to get rid of the minWidth set on PF Truncate component
          So we can show correct spacing between the title and the label
          The min width is set to 12 characters:
          https://github.com/patternfly/patternfly/blob/9499f0a70a18f51474285752a04928958d901829/src/patternfly/components/Truncate/truncate.scss#L4 */}
        {displayName.length > 12 ? <Truncate content={displayName} /> : <>{displayName}</>}
      </BreadcrumbItem>
      {experiment?.storage_state === StorageStateKF.ARCHIVED && <Label>Archived</Label>}
    </Breadcrumb>
  );
};

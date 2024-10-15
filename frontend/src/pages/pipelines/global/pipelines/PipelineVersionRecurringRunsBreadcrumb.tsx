import React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { pipelineVersionRecurringRunsRoute } from '~/routes';
import { PipelineVersionContext } from './PipelineVersionContext';

const PipelineVersionRecurringRunsBreadcrumb: React.FC = () => {
  const { version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();

  return (
    <BreadcrumbItem showDivider isActive>
      {version ? (
        <Link
          to={pipelineVersionRecurringRunsRoute(
            namespace,
            version.pipeline_id,
            version.pipeline_version_id,
          )}
        >
          Runs
        </Link>
      ) : (
        'Loading...'
      )}
    </BreadcrumbItem>
  );
};

export default PipelineVersionRecurringRunsBreadcrumb;

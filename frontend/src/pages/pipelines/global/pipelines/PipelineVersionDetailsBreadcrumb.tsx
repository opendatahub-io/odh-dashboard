import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { pipelineVersionDetailsRoute } from '~/routes';
import { PipelineVersionContext } from './PipelineVersionContext';

const PipelineVersionDetailsBreadcrumb: React.FC = () => {
  const { version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();

  return (
    <BreadcrumbItem showDivider isActive style={{ maxWidth: 300 }}>
      {version ? (
        <Link
          to={pipelineVersionDetailsRoute(
            namespace,
            version.pipeline_id,
            version.pipeline_version_id,
          )}
        >
          {/* TODO: Remove the custom className after upgrading to PFv6 */}
          <Truncate content={version.display_name} className="truncate-no-min-width" />
        </Link>
      ) : (
        'Loading...'
      )}
    </BreadcrumbItem>
  );
};

export default PipelineVersionDetailsBreadcrumb;

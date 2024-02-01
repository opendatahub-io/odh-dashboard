import React from 'react';
import { Text, TextVariants } from '@patternfly/react-core';
import { getPipelineJobExecutionCount } from '~/concepts/pipelines/content/tables/utils';
import { PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineJobReferenceNameProps = {
  resource: PipelineCoreResourceKF;
};

const PipelineJobReferenceName: React.FC<PipelineJobReferenceNameProps> = ({ resource }) => {
  const { getJobInformation } = usePipelinesAPI();
  const { data, loading } = getJobInformation(resource);

  return (
    <>
      {loading ? (
        'loading...'
      ) : data ? (
        <Text component={TextVariants.p} className="pf-u-pb-sm">
          Run {getPipelineJobExecutionCount(resource.name)} of {data?.name}
        </Text>
      ) : (
        ''
      )}
    </>
  );
};
export default PipelineJobReferenceName;

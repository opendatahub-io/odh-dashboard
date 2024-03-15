import React from 'react';
import { Text, TextVariants } from '@patternfly/react-core';
import { getPipelineJobExecutionCount } from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineJobReferenceNameProps = {
  runName: string;
  recurringRunId?: string;
};

const PipelineJobReferenceName: React.FC<PipelineJobReferenceNameProps> = ({
  runName,
  recurringRunId,
}) => {
  const { getJobInformation } = usePipelinesAPI();
  const { data, loading } = getJobInformation(recurringRunId);

  return (
    <>
      {loading ? (
        'loading...'
      ) : data ? (
        <Text component={TextVariants.p} className="pf-u-pb-sm">
          Run {getPipelineJobExecutionCount(runName)} of {data.display_name}
        </Text>
      ) : (
        ''
      )}
    </>
  );
};
export default PipelineJobReferenceName;

import React from 'react';
import { Text, TextVariants } from '@patternfly/react-core';
import { getPipelineRecurringRunExecutionCount } from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineRecurringRunReferenceNameProps = {
  runName: string;
  recurringRunId?: string;
};

const PipelineRecurringRunReferenceName: React.FC<PipelineRecurringRunReferenceNameProps> = ({
  runName,
  recurringRunId,
}) => {
  const { getRecurringRunInformation } = usePipelinesAPI();
  const { data, loading } = getRecurringRunInformation(recurringRunId);

  return (
    <>
      {loading ? (
        'loading...'
      ) : data ? (
        <Text component={TextVariants.p} className="pf-v5-u-pb-sm">
          Run {getPipelineRecurringRunExecutionCount(runName)} of {data.display_name}
        </Text>
      ) : (
        ''
      )}
    </>
  );
};
export default PipelineRecurringRunReferenceName;

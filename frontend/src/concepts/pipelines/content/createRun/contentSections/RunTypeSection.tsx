import React from 'react';

import { Alert, AlertActionCloseButton, FormSection } from '@patternfly/react-core';
import { useParams, Link } from 'react-router-dom';

import { PipelineRunTabTitle } from '~/pages/pipelines/global/runs';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { createRecurringRunRoute, createRunRoute } from '~/routes';
import { RunFormData, RunTypeOption } from '~/concepts/pipelines/content/createRun/types';

interface RunTypeSectionProps {
  data: RunFormData;
  isDuplicated: boolean;
}

export const RunTypeSection: React.FC<RunTypeSectionProps> = ({ data, isDuplicated }) => {
  const { namespace, experimentId, pipelineId, pipelineVersionId } = useParams();
  const [isAlertOpen, setIsAlertOpen] = React.useState(true);

  let runTypeValue = 'Run once immediately after creation';
  let alertTitle = (
    <>
      To create a schedule that executes recurring runs,{' '}
      <Link
        to={createRecurringRunRoute(namespace, experimentId, pipelineId, pipelineVersionId)}
        state={{ locationData: data }}
        data-testid="run-type-section-alert-link"
      >
        go to the {PipelineRunTabTitle.SCHEDULES} tab
      </Link>
      .
    </>
  );

  if (data.runType.type === RunTypeOption.SCHEDULED) {
    runTypeValue = 'Schedule recurring run';
    alertTitle = (
      <>
        To create a non-recurring run,{' '}
        <Link
          to={createRunRoute(namespace, experimentId, pipelineId, pipelineVersionId)}
          state={{ locationData: data }}
          data-testid="run-type-section-alert-link"
        >
          go to the {PipelineRunTabTitle.ACTIVE} tab
        </Link>
        .
      </>
    );
  }

  return (
    <FormSection
      id={CreateRunPageSections.RUN_TYPE}
      title={runPageSectionTitles[CreateRunPageSections.RUN_TYPE]}
    >
      {runTypeValue}

      {isAlertOpen && !isDuplicated && (
        <Alert
          isInline
          variant="info"
          title={alertTitle}
          actionClose={<AlertActionCloseButton onClose={() => setIsAlertOpen(false)} />}
        />
      )}
    </FormSection>
  );
};

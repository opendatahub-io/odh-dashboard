import React from 'react';

import { Alert, AlertActionCloseButton, FormSection } from '@patternfly/react-core';
import { useParams, Link } from 'react-router-dom';

import { PipelineRunTabTitle, PipelineRunType } from '~/pages/pipelines/global/runs';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import { createRunRoute, scheduleRunRoute } from '~/routes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

interface RunTypeSectionProps {
  runType: PipelineRunType;
}

export const RunTypeSection: React.FC<RunTypeSectionProps> = ({ runType }) => {
  const { namespace, experimentId } = useParams();
  const [isAlertOpen, setIsAlertOpen] = React.useState(true);
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  const runTypeValue = 'Run once immediately after creation';
  let alertTitle = (
    <>
      To create a schedule that executes recurring runs,{' '}
      <Link
        to={`${scheduleRunRoute(
          namespace,
          isExperimentsAvailable ? experimentId : undefined,
        )}?runType=${PipelineRunType.SCHEDULED}`}
        data-testid="run-type-section-alert-link"
      >
        go to the {PipelineRunTabTitle.SCHEDULES} tab
      </Link>
      .
    </>
  );

  if (runType === PipelineRunType.SCHEDULED) {
    alertTitle = (
      <>
        To create a non-recurring run,{' '}
        <Link
          to={`${createRunRoute(
            namespace,
            isExperimentsAvailable ? experimentId : undefined,
          )}?runType=${PipelineRunType.ACTIVE}`}
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

      {isAlertOpen && (
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

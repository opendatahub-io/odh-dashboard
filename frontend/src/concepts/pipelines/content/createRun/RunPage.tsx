import React from 'react';
import { useLocation } from 'react-router-dom';

import { PageSection } from '@patternfly/react-core';

import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import GenericSidebar from '~/components/GenericSidebar';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import RunForm from '~/concepts/pipelines/content/createRun/RunForm';
import useRunFormData from '~/concepts/pipelines/content/createRun/useRunFormData';
import RunPageFooter from '~/concepts/pipelines/content/createRun/RunPageFooter';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';

type RunPageProps = {
  // TODO, https://issues.redhat.com/browse/RHOAIENG-2273
  // cloneRun?: PipelineRunKFv2 | PipelineRunJobKF;
  cloneRun?: PipelineRunKFv2;
  contextPath?: string;
  testId?: string;
};

const RunPage: React.FC<RunPageProps> = ({ cloneRun, contextPath, testId }) => {
  const { namespace } = usePipelinesAPI();
  const location = useLocation();
  const cloneRunPipelineId = cloneRun?.pipeline_version_reference?.pipeline_id || '';
  const cloneRunVersionId = cloneRun?.pipeline_version_reference?.pipeline_version_id || '';

  const [cloneRunPipelineVersion] = usePipelineVersionById(cloneRunPipelineId, cloneRunVersionId);
  const [cloneRunPipeline] = usePipelineById(cloneRunPipelineId);

  const [formData, setFormDataValue] = useRunFormData(
    cloneRun,
    location.state?.lastPipeline || cloneRunPipeline,
    location.state?.lastVersion || cloneRunPipelineVersion,
  );

  return (
    <div data-testid={testId}>
      <PageSection isFilled variant="light">
        <GenericSidebar
          sections={Object.values(CreateRunPageSections)}
          titles={runPageSectionTitles}
          maxWidth={175}
        >
          <RunForm data={formData} onValueChange={(key, value) => setFormDataValue(key, value)} />
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <RunPageFooter data={formData} contextPath={contextPath ?? `/pipelineRuns/${namespace}`} />
      </PageSection>
    </div>
  );
};

export default RunPage;

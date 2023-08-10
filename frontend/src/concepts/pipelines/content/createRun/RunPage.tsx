import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useLocation } from 'react-router-dom';
import { PipelineRunJobKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import GenericSidebar from '~/components/GenericSidebar';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import RunForm from '~/concepts/pipelines/content/createRun/RunForm';
import useRunFormData from '~/concepts/pipelines/content/createRun/useRunFormData';
import RunPageFooter from '~/concepts/pipelines/content/createRun/RunPageFooter';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type RunPageProps = {
  cloneRun?: PipelineRunKF | PipelineRunJobKF;
  contextPath?: string;
};

const RunPage: React.FC<RunPageProps> = ({ cloneRun, contextPath }) => {
  const { namespace } = usePipelinesAPI();
  const location = useLocation();

  const [formData, setFormDataValue] = useRunFormData(cloneRun, location.state?.lastPipeline);

  return (
    <>
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
    </>
  );
};

export default RunPage;

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { PageSection } from '@patternfly/react-core';

import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import GenericSidebar from '~/components/GenericSidebar';
import {
  CreateRunPageSections,
  DEFAULT_PERIODIC_DATA,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import RunForm from '~/concepts/pipelines/content/createRun/RunForm';
import useRunFormData from '~/concepts/pipelines/content/createRun/useRunFormData';
import RunPageFooter from '~/concepts/pipelines/content/createRun/RunPageFooter';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import {
  RunFormData,
  RunTypeOption,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import { asEnumMember } from '~/utilities/utils';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';

type RunPageProps = {
  cloneRun?: PipelineRunKFv2 | PipelineRunJobKFv2 | null;
  contextPath?: string;
  testId?: string;
};

const RunPage: React.FC<RunPageProps> = ({ cloneRun, contextPath, testId }) => {
  const { namespace } = useParams();
  const location = useLocation();
  const { runType, triggerType: triggerTypeString } = useGetSearchParamValues([
    PipelineRunSearchParam.RunType,
    PipelineRunSearchParam.TriggerType,
  ]);
  const triggerType = asEnumMember(triggerTypeString, ScheduledType);

  const cloneRunPipelineId = cloneRun?.pipeline_version_reference.pipeline_id || '';
  const cloneRunVersionId = cloneRun?.pipeline_version_reference.pipeline_version_id || '';
  const cloneRunExperimentId = cloneRun?.experiment_id || '';

  const [cloneRunPipelineVersion] = usePipelineVersionById(cloneRunPipelineId, cloneRunVersionId);
  const [cloneRunPipeline] = usePipelineById(cloneRunPipelineId);
  const [cloneRunExperiment] = useExperimentById(cloneRunExperimentId);

  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  const sections = isExperimentsAvailable
    ? Object.values(CreateRunPageSections)
    : Object.values(CreateRunPageSections).filter(
        (section) => section !== CreateRunPageSections.EXPERIMENT,
      );

  const [formData, setFormDataValue] = useRunFormData(cloneRun, {
    runType: {
      ...(runType === PipelineRunType.Scheduled
        ? {
            type: RunTypeOption.SCHEDULED,
            data: {
              ...DEFAULT_PERIODIC_DATA,
              triggerType: triggerType || ScheduledType.PERIODIC,
            },
          }
        : { type: RunTypeOption.ONE_TRIGGER }),
    },
    pipeline: location.state?.lastPipeline || cloneRunPipeline,
    version: location.state?.lastVersion || cloneRunPipelineVersion,
    experiment: cloneRunExperiment,
  });

  const onValueChange = React.useCallback(
    (key: keyof RunFormData, value: ValueOf<RunFormData>) => setFormDataValue(key, value),
    [setFormDataValue],
  );

  return (
    <div data-testid={testId}>
      <PageSection isFilled variant="light">
        <GenericSidebar sections={sections} titles={runPageSectionTitles} maxWidth={175}>
          <RunForm
            data={formData}
            runType={runType as PipelineRunType}
            onValueChange={onValueChange}
          />
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <RunPageFooter data={formData} contextPath={contextPath ?? `/pipelineRuns/${namespace}`} />
      </PageSection>
    </div>
  );
};

export default RunPage;

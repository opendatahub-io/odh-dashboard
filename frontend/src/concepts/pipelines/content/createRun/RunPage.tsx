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
  RunType,
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
import { routePipelineRunsNamespace } from '~/routes';

type RunPageProps = {
  cloneRun?: PipelineRunKFv2 | PipelineRunJobKFv2 | null;
  contextPath?: string;
  testId?: string;
};

const RunPage: React.FC<RunPageProps> = ({ cloneRun, contextPath, testId }) => {
  const { namespace, experimentId } = useParams();
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
  const [runExperiment] = useExperimentById(cloneRunExperimentId || experimentId);

  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  const jumpToSections = Object.values(CreateRunPageSections).filter(
    (section) =>
      !(
        (section === CreateRunPageSections.EXPERIMENT && !isExperimentsAvailable) ||
        (section === CreateRunPageSections.SCHEDULE_SETTINGS &&
          runType !== PipelineRunType.Scheduled)
      ),
  );

  const runTypeData: RunType = React.useMemo(
    () =>
      runType === PipelineRunType.Scheduled
        ? {
            type: RunTypeOption.SCHEDULED,
            data: {
              ...DEFAULT_PERIODIC_DATA,
              triggerType: triggerType || ScheduledType.PERIODIC,
            },
          }
        : { type: RunTypeOption.ONE_TRIGGER },
    [runType, triggerType],
  );

  const [formData, setFormDataValue] = useRunFormData(cloneRun, {
    runType: runTypeData,
    pipeline: location.state?.lastPipeline || cloneRunPipeline,
    version: location.state?.lastVersion || cloneRunPipelineVersion,
    experiment: runExperiment,
  });

  // need to correctly set runType after switching between run types as the form data is not updated automatically
  React.useEffect(() => {
    // set the data if the url run type is different from the form data run type
    if (
      (runType === PipelineRunType.Scheduled &&
        formData.runType.type === RunTypeOption.ONE_TRIGGER) ||
      (runType !== PipelineRunType.Scheduled && formData.runType.type === RunTypeOption.SCHEDULED)
    ) {
      setFormDataValue('runType', runTypeData);
    }
  }, [formData.runType.type, runType, runTypeData, setFormDataValue]);

  const onValueChange = React.useCallback(
    (key: keyof RunFormData, value: ValueOf<RunFormData>) => setFormDataValue(key, value),
    [setFormDataValue],
  );

  return (
    <div data-testid={testId}>
      <PageSection isFilled variant="light">
        <GenericSidebar sections={jumpToSections} titles={runPageSectionTitles} maxWidth={175}>
          <RunForm
            data={formData}
            runType={runType as PipelineRunType}
            onValueChange={onValueChange}
          />
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <RunPageFooter
          data={formData}
          contextPath={contextPath ?? routePipelineRunsNamespace(namespace)}
        />
      </PageSection>
    </div>
  );
};

export default RunPage;

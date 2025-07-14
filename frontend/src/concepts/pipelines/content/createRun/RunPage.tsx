import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageSection } from '@patternfly/react-core';
import { ExperimentKF, PipelineRecurringRunKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import GenericSidebar from '#~/components/GenericSidebar';
import {
  CreateRunPageSections,
  DEFAULT_PERIODIC_DATA,
  runPageSectionTitles,
} from '#~/concepts/pipelines/content/createRun/const';
import RunForm from '#~/concepts/pipelines/content/createRun/RunForm';
import useRunFormData from '#~/concepts/pipelines/content/createRun/useRunFormData';
import RunPageFooter from '#~/concepts/pipelines/content/createRun/RunPageFooter';
import {
  PipelineVersionToUse,
  RunFormData,
  RunType,
  RunTypeOption,
  ScheduledType,
} from '#~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '#~/typeHelpers';
import { useGetSearchParamValues } from '#~/utilities/useGetSearchParamValues';
import { PipelineRunSearchParam } from '#~/concepts/pipelines/content/types';
import { asEnumMember } from '#~/utilities/utils';
import useDefaultExperiment from '#~/pages/pipelines/global/experiments/useDefaultExperiment';

type RunPageProps = {
  duplicateRun?: PipelineRunKF | PipelineRecurringRunKF | null;
  contextPath: string;
  testId?: string;
  runType: RunTypeOption;
  contextExperiment?: ExperimentKF | null;
};

const RunPage: React.FC<RunPageProps> = ({
  duplicateRun,
  contextPath,
  testId,
  runType,
  contextExperiment,
}) => {
  const location = useLocation();
  // the data passed in when creating a run from a pipeline version
  const { pipeline: contextPipeline, version: contextPipelineVersion } =
    location.state?.contextData || {};
  // the data passed in when switching between runs and schedules
  const {
    nameDesc: locationNameDesc,
    pipeline: locationPipeline,
    version: locationVersion,
    experiment: locationExperiment,
  } = location.state?.locationData || {};
  const { triggerType: triggerTypeString } = useGetSearchParamValues([
    PipelineRunSearchParam.TriggerType,
  ]);
  const triggerType = asEnumMember(triggerTypeString, ScheduledType);
  const isSchedule = runType === RunTypeOption.SCHEDULED;

  const [defaultExperiment] = useDefaultExperiment();

  const jumpToSections = Object.values(CreateRunPageSections).filter(
    (section) =>
      !(
        (section === CreateRunPageSections.SCHEDULE_DETAILS && !isSchedule) ||
        (section === CreateRunPageSections.RUN_DETAILS && isSchedule)
      ),
  );

  const runTypeData: RunType = React.useMemo(
    () =>
      isSchedule
        ? {
            type: RunTypeOption.SCHEDULED,
            data: {
              ...DEFAULT_PERIODIC_DATA,
              triggerType: triggerType || ScheduledType.PERIODIC,
            },
          }
        : { type: RunTypeOption.ONE_TRIGGER },
    [isSchedule, triggerType],
  );

  const versionToUseData = React.useMemo<PipelineVersionToUse>(
    () =>
      locationVersion || contextPipelineVersion
        ? PipelineVersionToUse.PROVIDED
        : PipelineVersionToUse.LATEST,
    [locationVersion, contextPipelineVersion],
  );

  const [formData, setFormDataValue] = useRunFormData(duplicateRun, {
    nameDesc: duplicateRun
      ? {
          name: `Duplicate of ${duplicateRun.display_name}`,
          description: duplicateRun.description,
        }
      : locationNameDesc || { name: '', description: '' },
    runType: runTypeData,
    pipeline: locationPipeline || contextPipeline,
    version: locationVersion || contextPipelineVersion,
    versionToUse: versionToUseData,
    experiment: locationExperiment || contextExperiment || defaultExperiment,
  });

  const onValueChange = React.useCallback(
    (key: keyof RunFormData, value: ValueOf<RunFormData>) => setFormDataValue(key, value),
    [setFormDataValue],
  );

  return (
    <div data-testid={testId}>
      <PageSection hasBodyWrapper={false} isFilled>
        <GenericSidebar sections={jumpToSections} titles={runPageSectionTitles} maxWidth={175}>
          <RunForm isDuplicated={!!duplicateRun} data={formData} onValueChange={onValueChange} />
        </GenericSidebar>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <RunPageFooter data={formData} contextPath={contextPath} />
      </PageSection>
    </div>
  );
};

export default RunPage;

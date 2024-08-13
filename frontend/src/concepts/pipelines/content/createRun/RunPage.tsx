import React from 'react';
import { useLocation } from 'react-router-dom';

import { PageSection } from '@patternfly/react-core';

import {
  ExperimentKFv2,
  PipelineKFv2,
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import GenericSidebar from '~/components/GenericSidebar';
import {
  CreateRunPageSections,
  DEFAULT_PERIODIC_DATA,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import RunForm from '~/concepts/pipelines/content/createRun/RunForm';
import useRunFormData from '~/concepts/pipelines/content/createRun/useRunFormData';
import RunPageFooter from '~/concepts/pipelines/content/createRun/RunPageFooter';
import {
  RunFormData,
  RunType,
  RunTypeOption,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { asEnumMember } from '~/utilities/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useDefaultExperiment from '~/pages/pipelines/global/experiments/useDefaultExperiment';

type RunPageProps = {
  cloneRun?: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null;
  contextPath: string;
  testId?: string;
  runType: RunTypeOption;
  contextExperiment?: ExperimentKFv2 | null;
  contextPipeline?: PipelineKFv2 | null;
  contextPipelineVersion?: PipelineVersionKFv2 | null;
};

const RunPage: React.FC<RunPageProps> = ({
  cloneRun,
  contextPath,
  testId,
  runType,
  contextExperiment,
  contextPipeline,
  contextPipelineVersion,
}) => {
  const location = useLocation();
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

  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
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

  const [formData, setFormDataValue] = useRunFormData(cloneRun, {
    nameDesc: cloneRun
      ? { name: `Duplicate of ${cloneRun.display_name}`, description: cloneRun.description }
      : locationNameDesc || { name: '', description: '' },
    runType: runTypeData,
    pipeline: locationPipeline || contextPipeline,
    version: locationVersion || contextPipelineVersion,
    experiment: locationExperiment || contextExperiment || defaultExperiment,
  });

  const onValueChange = React.useCallback(
    (key: keyof RunFormData, value: ValueOf<RunFormData>) => setFormDataValue(key, value),
    [setFormDataValue],
  );

  const runPageSectionTitlesEdited = isExperimentsAvailable
    ? runPageSectionTitles
    : {
        ...runPageSectionTitles,
        [CreateRunPageSections.PROJECT_AND_EXPERIMENT]: 'Project',
      };

  return (
    <div data-testid={testId}>
      <PageSection isFilled variant="light">
        <GenericSidebar
          sections={jumpToSections}
          titles={runPageSectionTitlesEdited}
          maxWidth={175}
        >
          <RunForm isCloned={!!cloneRun} data={formData} onValueChange={onValueChange} />
        </GenericSidebar>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <RunPageFooter data={formData} contextPath={contextPath} />
      </PageSection>
    </div>
  );
};

export default RunPage;

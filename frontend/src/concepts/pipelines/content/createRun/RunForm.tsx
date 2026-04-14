import * as React from 'react';
import { Form, FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import NameDescriptionField from '#~/concepts/k8s/NameDescriptionField';
import {
  MlflowFormData,
  PipelineVersionToUse,
  RunFormData,
  RunTypeOption,
} from '#~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '#~/typeHelpers';
import { ParamsSection } from '#~/concepts/pipelines/content/createRun/contentSections/ParamsSection/ParamsSection';
import RunTypeSectionScheduled from '#~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionScheduled';
import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineVersionKF,
  RuntimeConfigParameters,
} from '#~/concepts/pipelines/kfTypes';
import ProjectSection from '#~/concepts/pipelines/content/createRun/contentSections/ProjectSection';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { ActiveExperimentSelector } from '#~/concepts/pipelines/content/experiment/ExperimentSelector';
import { useLatestPipelineVersion } from '#~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import { getNameEqualsFilter } from '#~/concepts/pipelines/utils';
import { DuplicateNameHelperText } from '#~/concepts/pipelines/content/DuplicateNameHelperText';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import { isArgoWorkflow } from '#~/concepts/pipelines/content/tables/utils';
import {
  NAME_CHARACTER_LIMIT,
  DESCRIPTION_CHARACTER_LIMIT,
} from '#~/concepts/pipelines/content/const';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { runGroupCreateModalPopoverText } from '#~/pages/pipelines/global/runs/const';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import MlflowIntegrationSection from './contentSections/MlflowIntegrationSection';
import PipelineSection from './contentSections/PipelineSection';
import { RunTypeSection } from './contentSections/RunTypeSection';
import { CreateRunPageSections, runPageSectionTitles } from './const';
import { getInputDefinitionParams } from './utils';

type RunFormProps = {
  data: RunFormData;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
  isDuplicated: boolean;
};

const RunForm: React.FC<RunFormProps> = ({ data, onValueChange, isDuplicated }) => {
  const { api, namespace } = usePipelinesAPI();
  const { status: isMlflowAvailable } = useIsAreaAvailable(SupportedArea.MLFLOW_PIPELINES);
  const [latestVersion, latestVersionLoaded] = useLatestPipelineVersion(data.pipeline?.pipeline_id);
  // Use this state to avoid the pipeline version being set as the latest version at the initial load
  const [initialLoadedState, setInitialLoadedState] = React.useState(true);
  const selectedVersion = React.useMemo(() => {
    const version = data.version || latestVersion;
    if (isArgoWorkflow(version?.pipeline_spec)) {
      onValueChange('version', null);
      return null;
    }
    return version;
  }, [data.version, latestVersion, onValueChange]);

  const paramsRef = React.useRef(data.params);
  const isSchedule = data.runType.type === RunTypeOption.SCHEDULED;
  const { name } = data.nameDesc;
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);

  const checkForDuplicateName = useDebounceCallback(
    React.useCallback(
      async (value: string) => {
        if (value) {
          let duplicateRuns: PipelineRunKF[] | PipelineRecurringRunKF[] | undefined = [];

          if (isSchedule) {
            const { recurringRuns } = await api.listPipelineRecurringRuns(
              {},
              getNameEqualsFilter(value),
            );
            duplicateRuns = recurringRuns;
          } else {
            const { runs } = await api.listPipelineActiveRuns({}, getNameEqualsFilter(value));
            duplicateRuns = runs;
          }

          if (duplicateRuns?.length) {
            setHasDuplicateName(true);
          }
        }
      },
      [api, isSchedule],
    ),
    500,
  );

  const updateInputParams = React.useCallback(
    (version: PipelineVersionKF | undefined) =>
      onValueChange(
        'params',
        Object.entries(getInputDefinitionParams(version) || {}).reduce(
          (acc: RuntimeConfigParameters, [paramKey, paramValue]) => {
            acc[paramKey] = paramsRef.current?.[paramKey] ?? paramValue.defaultValue;
            return acc;
          },
          {},
        ),
      ),
    [onValueChange],
  );

  React.useEffect(() => {
    if (!initialLoadedState && latestVersion) {
      onValueChange('version', latestVersion);
      onValueChange('versionToUse', PipelineVersionToUse.LATEST);
      updateInputParams(latestVersion);
    }
  }, [initialLoadedState, latestVersion, onValueChange, updateInputParams]);

  return (
    <Form onSubmit={(e) => e.preventDefault()} maxWidth="500px">
      <RunTypeSection data={data} isDuplicated={isDuplicated} />

      <ProjectSection projectName={getDisplayNameFromK8sResource(data.project)} />

      <FormSection
        id={isSchedule ? CreateRunPageSections.SCHEDULE_DETAILS : CreateRunPageSections.RUN_DETAILS}
        title={
          runPageSectionTitles[
            isSchedule ? CreateRunPageSections.SCHEDULE_DETAILS : CreateRunPageSections.RUN_DETAILS
          ]
        }
      >
        <NameDescriptionField
          nameFieldId="run-name"
          descriptionFieldId="run-description"
          data={data.nameDesc}
          setData={(nameDesc) => onValueChange('nameDesc', nameDesc)}
          maxLengthName={NAME_CHARACTER_LIMIT}
          maxLengthDesc={DESCRIPTION_CHARACTER_LIMIT}
          onNameChange={(value) => {
            setHasDuplicateName(false);
            checkForDuplicateName(value);
          }}
          nameHelperText={hasDuplicateName ? <DuplicateNameHelperText name={name} /> : undefined}
        />

        <FormGroup
          label="Run group"
          aria-label="Run group"
          isRequired
          labelHelp={<DashboardHelpTooltip content={runGroupCreateModalPopoverText} />}
        >
          <Stack hasGutter>
            <StackItem>
              <ActiveExperimentSelector
                selection={data.experiment?.display_name}
                onSelect={(runGroup) => onValueChange('experiment', runGroup)}
              />
            </StackItem>
          </Stack>
        </FormGroup>

        {isSchedule && data.runType.type === RunTypeOption.SCHEDULED && (
          <RunTypeSectionScheduled
            data={data.runType.data}
            onChange={(scheduleData) =>
              onValueChange('runType', { type: RunTypeOption.SCHEDULED, data: scheduleData })
            }
          />
        )}
      </FormSection>

      <PipelineSection
        pipeline={data.pipeline}
        selectedVersion={selectedVersion}
        latestVersion={latestVersion}
        latestVersionLoaded={latestVersionLoaded}
        versionToUse={data.versionToUse}
        onValueChange={onValueChange}
        updateInputParams={updateInputParams}
        setInitialLoadedState={setInitialLoadedState}
        isSchedule={isSchedule}
      />

      {isMlflowAvailable && (
        <MlflowIntegrationSection
          data={data.mlflow}
          onChange={(mlflow: MlflowFormData) => onValueChange('mlflow', mlflow)}
          workspace={namespace}
        />
      )}

      <ParamsSection
        runParams={data.params}
        version={selectedVersion}
        onChange={(p) => onValueChange('params', p)}
      />
    </Form>
  );
};

export default RunForm;

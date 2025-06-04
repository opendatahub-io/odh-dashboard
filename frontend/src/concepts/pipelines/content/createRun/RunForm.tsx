import * as React from 'react';
import { Form, FormSection, HelperText, HelperTextItem } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  LimitNameResourceType,
  isK8sNameDescriptionDataValid,
} from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import {
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
import ProjectAndExperimentSection from '#~/concepts/pipelines/content/createRun/contentSections/ProjectAndExperimentSection';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { useLatestPipelineVersion } from '#~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import { getNameEqualsFilter } from '#~/concepts/pipelines/utils';
import { DuplicateNameHelperText } from '#~/concepts/pipelines/content/DuplicateNameHelperText';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import { isArgoWorkflow } from '#~/concepts/pipelines/content/tables/utils';
import { CharLimitHelperText } from '#~/components/CharLimitHelperText';
import { getInputDefinitionParams } from './utils';
import { CreateRunPageSections, runPageSectionTitles } from './const';
import PipelineSection from './contentSections/PipelineSection';
import { RunTypeSection } from './contentSections/RunTypeSection';

type RunFormProps = {
  data: RunFormData;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
  isDuplicated: boolean;
  onValidationChange: (isValid: boolean) => void;
};

const RunForm: React.FC<RunFormProps> = ({
  data,
  onValueChange,
  isDuplicated,
  onValidationChange,
}) => {
  const { api } = usePipelinesAPI();
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
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);

  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData({
    initialData: {
      name: data.nameDesc.name,
      description: data.nameDesc.description,
      k8sName: translateDisplayNameForK8s(data.nameDesc.name),
    },
    limitNameResourceType: LimitNameResourceType.PIPELINE_RUN,
    editableK8sName: isDuplicated,
  });

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

  const isValid = React.useMemo(
    () =>
      isK8sNameDescriptionDataValid(nameDescData) &&
      !hasDuplicateName &&
      nameDescData.name.length <= nameDescData.k8sName.state.maxLength &&
      nameDescData.description.length <= nameDescData.k8sName.state.maxLength,
    [nameDescData, hasDuplicateName],
  );

  React.useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  return (
    <Form onSubmit={(e) => e.preventDefault()} maxWidth="500px">
      <RunTypeSection data={data} isDuplicated={isDuplicated} />

      <ProjectAndExperimentSection
        projectName={getDisplayNameFromK8sResource(data.project)}
        value={data.experiment}
        onChange={(experiment) => onValueChange('experiment', experiment)}
      />

      <FormSection
        id={isSchedule ? CreateRunPageSections.SCHEDULE_DETAILS : CreateRunPageSections.RUN_DETAILS}
        title={
          runPageSectionTitles[
            isSchedule ? CreateRunPageSections.SCHEDULE_DETAILS : CreateRunPageSections.RUN_DETAILS
          ]
        }
      >
        <K8sNameDescriptionField
          dataTestId="run"
          data={nameDescData}
          onDataChange={(key, value) => {
            setNameDescData(key, value);
            onValueChange('nameDesc', {
              ...data.nameDesc,
              [key]: value,
            });
            if (key === 'name') {
              setHasDuplicateName(false);
              checkForDuplicateName(value);
            }
          }}
          nameHelperText={
            <>
              {hasDuplicateName && <DuplicateNameHelperText name={nameDescData.name} />}
              {nameDescData.name.length > nameDescData.k8sName.state.maxLength && (
                <HelperText>
                  <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                    <CharLimitHelperText limit={nameDescData.k8sName.state.maxLength} />
                  </HelperTextItem>
                </HelperText>
              )}
            </>
          }
          descriptionHelperText={
            nameDescData.description.length > nameDescData.k8sName.state.maxLength && (
              <HelperText>
                <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                  <CharLimitHelperText limit={nameDescData.k8sName.state.maxLength} />
                </HelperTextItem>
              </HelperText>
            )
          }
        />

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

      <ParamsSection
        runParams={data.params}
        version={selectedVersion}
        onChange={(p) => onValueChange('params', p)}
      />
    </Form>
  );
};

export default RunForm;

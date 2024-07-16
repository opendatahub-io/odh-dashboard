import * as React from 'react';
import { Form, FormSection } from '@patternfly/react-core';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { RunFormData, RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import { ParamsSection } from '~/concepts/pipelines/content/createRun/contentSections/ParamsSection';
import RunTypeSectionScheduled from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionScheduled';
import { PipelineVersionKFv2, RuntimeConfigParameters } from '~/concepts/pipelines/kfTypes';
import ProjectAndExperimentSection from '~/concepts/pipelines/content/createRun/contentSections/ProjectAndExperimentSection';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { useLatestPipelineVersion } from '~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import PipelineSection from './contentSections/PipelineSection';
import { RunTypeSection } from './contentSections/RunTypeSection';
import { CreateRunPageSections, RUN_NAME_CHARACTER_LIMIT, runPageSectionTitles } from './const';
import { getInputDefinitionParams } from './utils';

type RunFormProps = {
  data: RunFormData;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
  isCloned: boolean;
};

const RunForm: React.FC<RunFormProps> = ({ data, onValueChange, isCloned }) => {
  const [latestVersion] = useLatestPipelineVersion(data.pipeline?.pipeline_id);
  // Use this state to avoid the pipeline version being set as the latest version at the initial load
  const [initialLoadedState, setInitialLoadedState] = React.useState(true);
  const selectedVersion = data.version || latestVersion;
  const paramsRef = React.useRef(data.params);
  const isSchedule = data.runType.type === RunTypeOption.SCHEDULED;

  const updateInputParams = React.useCallback(
    (version: PipelineVersionKFv2 | undefined) =>
      onValueChange(
        'params',
        Object.entries(getInputDefinitionParams(version) || {}).reduce(
          (acc: RuntimeConfigParameters, [paramKey, paramValue]) => {
            acc[paramKey] = paramsRef.current?.[paramKey] ?? paramValue.defaultValue ?? '';
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
      updateInputParams(latestVersion);
    }
  }, [initialLoadedState, latestVersion, onValueChange, updateInputParams]);

  return (
    <Form onSubmit={(e) => e.preventDefault()} maxWidth="500px">
      <RunTypeSection data={data} isCloned={isCloned} />

      <ProjectAndExperimentSection
        projectName={getDisplayNameFromK8sResource(data.project)}
        value={data.experiment}
        onChange={(experiment) => onValueChange('experiment', experiment)}
        isSchedule={isSchedule}
      />

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
          maxLength={RUN_NAME_CHARACTER_LIMIT}
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
        version={selectedVersion}
        onValueChange={onValueChange}
        updateInputParams={updateInputParams}
        setInitialLoadedState={setInitialLoadedState}
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

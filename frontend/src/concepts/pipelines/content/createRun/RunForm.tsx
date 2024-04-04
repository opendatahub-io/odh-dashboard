import * as React from 'react';
import { Form, FormSection, Text } from '@patternfly/react-core';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { RunFormData, RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import { ParamsSection } from '~/concepts/pipelines/content/createRun/contentSections/ParamsSection';
import { getProjectDisplayName } from '~/pages/projects/utils';
import PipelineVersionSection from '~/concepts/pipelines/content/createRun/contentSections/PipelineVersionSection';
import { useLatestPipelineVersion } from '~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import RunTypeSectionScheduled from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionScheduled';
import { PipelineVersionKFv2, RuntimeConfigParameters } from '~/concepts/pipelines/kfTypes';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import ExperimentSection from '~/concepts/pipelines/content/createRun/contentSections/ExperimentSection';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import PipelineSection from './contentSections/PipelineSection';
import { RunTypeSection } from './contentSections/RunTypeSection';
import { CreateRunPageSections, runPageSectionTitles } from './const';
import { getInputDefinitionParams } from './utils';

type RunFormProps = {
  data: RunFormData;
  runType: PipelineRunType;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
};

const RunForm: React.FC<RunFormProps> = ({ data, runType, onValueChange }) => {
  const [latestVersion] = useLatestPipelineVersion(data.pipeline?.pipeline_id);
  const selectedVersion = data.version || latestVersion;
  const paramsRef = React.useRef(data.params);
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

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
    if (latestVersion) {
      onValueChange('version', latestVersion);
      updateInputParams(latestVersion);
    }
  }, [latestVersion, onValueChange, updateInputParams]);

  return (
    <Form onSubmit={(e) => e.preventDefault()} maxWidth="500px">
      <RunTypeSection runType={runType} />

      <FormSection
        id={CreateRunPageSections.PROJECT}
        title={runPageSectionTitles[CreateRunPageSections.PROJECT]}
      >
        <Text>{getProjectDisplayName(data.project)}</Text>
      </FormSection>

      <FormSection
        id={CreateRunPageSections.NAME_DESC}
        aria-label={runPageSectionTitles[CreateRunPageSections.NAME_DESC]}
      >
        <NameDescriptionField
          nameFieldId="run-name"
          descriptionFieldId="run-description"
          data={data.nameDesc}
          setData={(nameDesc) => onValueChange('nameDesc', nameDesc)}
        />
      </FormSection>

      {isExperimentsAvailable && (
        <ExperimentSection
          value={data.experiment}
          onChange={(experiment) => onValueChange('experiment', experiment)}
        />
      )}

      <PipelineSection
        value={data.pipeline}
        onChange={async (pipeline) => {
          onValueChange('pipeline', pipeline);
          onValueChange('version', undefined);
        }}
      />

      <PipelineVersionSection
        selectedPipeline={data.pipeline}
        value={selectedVersion}
        onChange={(version) => {
          onValueChange('version', version);
          updateInputParams(version);
        }}
      />

      {runType === PipelineRunType.Scheduled && data.runType.type === RunTypeOption.SCHEDULED && (
        <FormSection
          id={CreateRunPageSections.SCHEDULE_SETTINGS}
          title={runPageSectionTitles[CreateRunPageSections.SCHEDULE_SETTINGS]}
        >
          <RunTypeSectionScheduled
            data={data.runType.data}
            onChange={(scheduleData) =>
              onValueChange('runType', { type: RunTypeOption.SCHEDULED, data: scheduleData })
            }
          />
        </FormSection>
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

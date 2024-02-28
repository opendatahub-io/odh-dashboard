import * as React from 'react';
import { Form, FormGroup, FormSection, Text } from '@patternfly/react-core';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import {
  RunFormData,
  RunTypeOption,
  ScheduledRunType,
} from '~/concepts/pipelines/content/createRun/types';
import { ValueOf } from '~/typeHelpers';
import ParamsSection from '~/concepts/pipelines/content/createRun/contentSections/ParamsSection';
import { getProjectDisplayName } from '~/pages/projects/utils';
import PipelineVersionSection from '~/concepts/pipelines/content/createRun/contentSections/PipelineVersionSection';
import { useLatestPipelineVersion } from '~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import RunTypeSectionScheduled from '~/concepts/pipelines/content/createRun/contentSections/RunTypeSectionScheduled';
import { PipelineVersionKFv2, RuntimeConfigParameters } from '~/concepts/pipelines/kfTypes';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import PipelineSection from './contentSections/PipelineSection';
import { CreateRunPageSections, runPageSectionTitles } from './const';

type RunFormProps = {
  data: RunFormData;
  runType: PipelineRunType;
  onValueChange: (key: keyof RunFormData, value: ValueOf<RunFormData>) => void;
};

const RunForm: React.FC<RunFormProps> = ({ data, runType, onValueChange }) => {
  const [latestVersion] = useLatestPipelineVersion(data.pipeline?.pipeline_id);
  const selectedVersion = data.version || latestVersion;
  const paramsRef = React.useRef(data.params);

  const updateInputParams = React.useCallback(
    (version: PipelineVersionKFv2 | undefined) =>
      onValueChange(
        'params',
        Object.keys(version?.pipeline_spec?.root?.inputDefinitions?.parameters || {}).reduce(
          (acc: RuntimeConfigParameters, parameter) => {
            acc[parameter] = paramsRef.current?.[parameter] ?? '';
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
    <Form
      maxWidth="500px"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <FormSection id="run-section-project-name" title="Project">
        <FormGroup label="Project">
          <Text>{getProjectDisplayName(data.project)}</Text>
        </FormGroup>
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
      {runType === PipelineRunType.Scheduled && (
        <RunTypeSectionScheduled
          data={(data.runType as ScheduledRunType).data}
          onChange={(scheduleData) =>
            onValueChange('runType', { type: RunTypeOption.SCHEDULED, data: scheduleData })
          }
        />
      )}
      <ParamsSection
        runParams={data.params}
        versionId={selectedVersion?.pipeline_version_id}
        onChange={(p) => onValueChange('params', p)}
      />
    </Form>
  );
};

export default RunForm;

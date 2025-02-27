import * as React from 'react';
import {
  ExpandableSection,
  Form,
  FormGroup,
  FormSection,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import FineTunePageFooter from '~/pages/pipelines/global/modelCustomization/FineTunePageFooter';
import BaseModelSection from '~/pages/pipelines/global/modelCustomization/baseModelSection/BaseModelSection';
import TeacherModelSection from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherModelSection';
import JudgeModelSection from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/JudgeModelSection';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { ProjectFields } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  HyperparameterFields,
  RunTypeFormat,
  RunTypeFormatDescriptions,
} from './const';
import HyperparameterFieldsDisplay from './HyperparameterFields';

type FineTunePageProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
  ilabPipeline: PipelineKF | null;
  ilabPipelineVersion: PipelineVersionKF | null;
};

const FineTunePage: React.FC<FineTunePageProps> = ({
  isInvalid,
  onSuccess,
  data,
  setData,
  ilabPipeline,
  ilabPipelineVersion,
}) => {
  const { project } = usePipelinesAPI();
  const [isExpanded, setExpanded] = React.useState(false);

  const updateHyperparameters = (
    hyperparameter: HyperparameterFields,
    hyperparameterValue: string | number,
  ) => {
    setData(ProjectFields.HYPERPARAMETERS, {
      ...data.hyperparameters,
      [hyperparameter]: {
        ...data.hyperparameters[hyperparameter],
        defaultValue: hyperparameterValue,
      },
    });
  };

  return (
    <Form data-testid="fineTunePageForm">
      <FormSection
        id={FineTunePageSections.PROJECT_DETAILS}
        title={fineTunePageSectionTitles[FineTunePageSections.PROJECT_DETAILS]}
      >
        This project is used for running your pipeline
        <FormGroup
          label="Data Science Project"
          fieldId="model-customization-projectName"
          isRequired
        >
          <div>{getDisplayNameFromK8sResource(project)}</div>
        </FormGroup>
      </FormSection>
      <BaseModelSection
        data={data.baseModel}
        setData={(baseModelData) => setData('baseModel', baseModelData)}
      />
      <TeacherModelSection
        data={data.teacher}
        setData={(teacherData) => setData('teacher', teacherData)}
      />
      <JudgeModelSection data={data.judge} setData={(judgeData) => setData('judge', judgeData)} />
      <FormSection
        id={FineTunePageSections.RUN_TYPE}
        title={fineTunePageSectionTitles[FineTunePageSections.RUN_TYPE]}
      >
        Select the type of run you want to start based on your use case. Simple runs are best for
        iterating, and full runs are best for creating production-ready models.
        <FormGroup label="Run type" fieldId="model-customization-runType" isRequired>
          <Stack hasGutter>
            <StackItem>
              <Radio
                id="run-type-radio-full"
                label="Full run"
                name="run-type-radio-full"
                description={RunTypeFormatDescriptions.Full}
                value={RunTypeFormat.FULL}
                isChecked={data.runType.value === RunTypeFormat.FULL}
                onChange={() => setData(ProjectFields.RUN_TYPE, { value: RunTypeFormat.FULL })}
                data-testid="full-run-radio"
              />
            </StackItem>
            <StackItem>
              <Radio
                id="run-type-radio-simple"
                label="Simple run"
                name="run-type-radio-simple"
                value={RunTypeFormat.SIMPLE}
                description={RunTypeFormatDescriptions.Simple}
                isChecked={data.runType.value === RunTypeFormat.SIMPLE}
                onChange={() => setData(ProjectFields.RUN_TYPE, { value: RunTypeFormat.SIMPLE })}
                data-testid="simple-run-radio"
              />
            </StackItem>
          </Stack>
        </FormGroup>
      </FormSection>
      <FormSection
        id={FineTunePageSections.HYPERPARAMETERS}
        title={fineTunePageSectionTitles[FineTunePageSections.HYPERPARAMETERS]}
      >
        Configure advanced settings for this run.
        <ExpandableSection
          toggleText="Customize resource requests and limits"
          isExpanded={isExpanded}
          onToggle={(_, expanded) => setExpanded(expanded)}
          isIndented
          data-testid="hyperparameters-expandable"
        >
          <HyperparameterFieldsDisplay
            hyperparameters={data.hyperparameters}
            isEmpty={Object.keys(data.hyperparameters).length === 0}
            onChange={updateHyperparameters}
          />
        </ExpandableSection>
      </FormSection>
      <FormSection>
        <FineTunePageFooter
          isInvalid={isInvalid}
          onSuccess={onSuccess}
          data={data}
          ilabPipeline={ilabPipeline}
          ilabPipelineVersion={ilabPipelineVersion}
        />
      </FormSection>
    </Form>
  );
};

export default FineTunePage;

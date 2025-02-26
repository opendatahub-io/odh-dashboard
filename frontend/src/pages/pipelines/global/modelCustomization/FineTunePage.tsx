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
import {
  ProjectFields,
  FormTypes,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  fineTunePageSectionDescriptions,
  FineTunePageSections,
  fineTunePageSectionTitles,
  HyperparameterFields,
  RunTypeFormat,
  RunTypeFormatDescriptions,
} from './const';
import HyperparameterFieldsDisplay from './HyperparameterFields';

type FineTunePageProps = {
  isInvalid: boolean;
  updateForm: (field: ProjectFields, value: FormTypes) => void;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const FineTunePage: React.FC<FineTunePageProps> = ({
  isInvalid,
  data,
  updateForm,
  onSuccess,
  setData,
}) => {
  const { project } = usePipelinesAPI();
  const [isExpanded, setExpanded] = React.useState(false);

  const updateHyperparameters = (
    hyperparameter: HyperparameterFields,
    hyperparameterValue: string | number,
  ) => {
    updateForm(ProjectFields.HYPERPARAMETERS, {
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
        {fineTunePageSectionDescriptions[FineTunePageSections.PROJECT_DETAILS]}
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
      <FormSection
        id={FineTunePageSections.RUN_TYPE}
        title={fineTunePageSectionTitles[FineTunePageSections.RUN_TYPE]}
      >
        {fineTunePageSectionDescriptions[FineTunePageSections.RUN_TYPE]}
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
                onChange={() => updateForm(ProjectFields.RUN_TYPE, { value: RunTypeFormat.FULL })}
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
                onChange={() => updateForm(ProjectFields.RUN_TYPE, { value: RunTypeFormat.SIMPLE })}
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
        {fineTunePageSectionDescriptions[FineTunePageSections.HYPERPARAMETERS]}
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
        <FineTunePageFooter isInvalid={isInvalid} onSuccess={onSuccess} data={data} />
      </FormSection>
    </Form>
  );
};

export default FineTunePage;

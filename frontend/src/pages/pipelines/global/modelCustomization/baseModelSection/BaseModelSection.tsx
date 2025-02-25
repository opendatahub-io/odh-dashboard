import React from 'react';
import { Alert, Flex, FlexItem, FormGroup, FormSection } from '@patternfly/react-core';
import { BaseModelFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import InlineEditText from '~/pages/pipelines/global/modelCustomization/baseModelSection/InlineEditText';

const RED_HAT_REGISTRY_PREFIX = 'registry.redhat.io';
const FIELD_ID_PREFIX = 'model-customization-baseModel';

type BaseModelSectionProps = {
  data: BaseModelFormData;
  setData: (data: BaseModelFormData) => void;
};

const BaseModelSection: React.FC<BaseModelSectionProps> = ({ data, setData }) => (
  <FormSection
    id={FineTunePageSections.BASE_MODEL}
    title={fineTunePageSectionTitles[FineTunePageSections.BASE_MODEL]}
  >
    The pre-trained model that the fine-tuning run will further refine.
    <Flex>
      <FlexItem>
        <Alert
          isInline
          isExpandable
          variant="info"
          title={`${ODH_PRODUCT_NAME} supports InstructLab fine-tuning for only specific models.`}
        >
          Supported models are indicated by the InstructLab-tunable label in the model catalog.
          Fine-tuning unsupported models might result in unsatisfactory results.
        </Alert>
      </FlexItem>
    </Flex>
    <FormGroup label="Model registry" fieldId={`${FIELD_ID_PREFIX}-registryName`} required>
      {data.registryName}
    </FormGroup>
    <FormGroup label="Model name" fieldId={`${FIELD_ID_PREFIX}-name`} required>
      {data.name}
    </FormGroup>
    <FormGroup label="Model version" fieldId={`${FIELD_ID_PREFIX}-version`} required>
      {data.version}
    </FormGroup>
    <FormGroup
      label="Model input storage location URI"
      fieldId={`${FIELD_ID_PREFIX}-inputStorageLocationUri`}
      required
    >
      <InlineEditText
        onSave={(text) => {
          setData({ ...data, inputStorageLocationUri: text });
        }}
        checkSupported={(text) => text.startsWith(`${RED_HAT_REGISTRY_PREFIX}/`)}
        text={data.inputStorageLocationUri}
        unsupportedMessage={`At this time, the model must be sourced from the catalog in Red Hat Registry (${RED_HAT_REGISTRY_PREFIX}). However, if your platform is configured with the required pull secrets, the model can be sourced from an OCI registry or public setup.`}
      />
    </FormGroup>
  </FormSection>
);

export default BaseModelSection;

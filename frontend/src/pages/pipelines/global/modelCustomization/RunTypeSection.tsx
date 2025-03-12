import {
  FormSection,
  FormGroup,
  Stack,
  StackItem,
  Radio,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import * as React from 'react';
import { ProjectFields } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  RunTypeFormatDescriptions,
  RunTypeFormat,
} from './const';

type RunTypeSectionProps = {
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const RunTypeSection: React.FC<RunTypeSectionProps> = ({ data, setData }) => (
  <FormSection
    id={FineTunePageSections.RUN_TYPE}
    title={fineTunePageSectionTitles[FineTunePageSections.RUN_TYPE]}
  >
    <Content component={ContentVariants.small}>
      Select the type of run you want to start based on your use case. Simple runs are best for
      iterating, and full runs are best for creating production-ready models.
    </Content>
    <FormGroup label="Run type" fieldId="model-customization-runType">
      <Stack hasGutter>
        <StackItem>
          <Radio
            id="run-type-radio-full"
            label="Full run"
            name="run-type-radio-full"
            description={RunTypeFormatDescriptions.Full}
            value={RunTypeFormat.FULL}
            isChecked={data.runType === RunTypeFormat.FULL}
            onChange={() => setData(ProjectFields.RUN_TYPE, RunTypeFormat.FULL)}
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
            isChecked={data.runType === RunTypeFormat.SIMPLE}
            onChange={() => setData(ProjectFields.RUN_TYPE, RunTypeFormat.SIMPLE)}
            data-testid="simple-run-radio"
          />
        </StackItem>
      </Stack>
    </FormGroup>
  </FormSection>
);

export default RunTypeSection;

import { FormSection, ExpandableSection } from '@patternfly/react-core';
import * as React from 'react';
import { ProjectFields } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  HyperparameterFields,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import HyperparameterFieldsDisplay from './HyperparameterFields';

type HyperparameterPageSectionProps = {
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const HyperparameterPageSection: React.FC<HyperparameterPageSectionProps> = ({ data, setData }) => {
  const [isExpanded, setExpanded] = React.useState(false);

  return (
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
          onChange={(
            hyperparameter: HyperparameterFields,
            hyperparameterValue: string | number | boolean,
          ) => {
            setData(ProjectFields.HYPERPARAMETERS, {
              ...data.hyperparameters,
              [hyperparameter]: {
                ...data.hyperparameters[hyperparameter],
                defaultValue: hyperparameterValue,
              },
            });
          }}
        />
      </ExpandableSection>
    </FormSection>
  );
};
export default HyperparameterPageSection;

import { FormSection, ExpandableSection, Content, ContentVariants } from '@patternfly/react-core';
import * as React from 'react';
import { ProjectFields } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { ParametersKF, RuntimeConfigParamValue } from '~/concepts/pipelines/kfTypes';
import HyperparameterFieldsDisplay from './HyperparameterFields';

type HyperparameterPageSectionProps = {
  hyperparameters: ParametersKF;
  data: ModelCustomizationFormData;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
};

const HyperparameterPageSection: React.FC<HyperparameterPageSectionProps> = ({
  hyperparameters,
  data,
  setData,
}) => {
  const [isExpanded, setExpanded] = React.useState(false);

  return (
    <FormSection
      id={FineTunePageSections.HYPERPARAMETERS}
      title={fineTunePageSectionTitles[FineTunePageSections.HYPERPARAMETERS]}
    >
      <Content component={ContentVariants.small}>Configure advanced settings for this run.</Content>
      <ExpandableSection
        toggleTextCollapsed="Show more"
        toggleTextExpanded="Show less"
        isExpanded={isExpanded}
        onToggle={(_, expanded) => setExpanded(expanded)}
        isIndented
        data-testid="hyperparameters-expandable"
      >
        <HyperparameterFieldsDisplay
          hyperparameters={hyperparameters}
          isEmpty={Object.keys(hyperparameters).length === 0}
          data={data}
          onChange={(hyperparameter: string, hyperparameterValue?: RuntimeConfigParamValue) => {
            setData(ProjectFields.HYPERPARAMETERS, {
              ...data.hyperparameters,
              [hyperparameter]: hyperparameterValue,
            });
          }}
        />
      </ExpandableSection>
    </FormSection>
  );
};
export default HyperparameterPageSection;

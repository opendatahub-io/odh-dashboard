import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '#~/pages/pipelines/global/modelCustomization/const';
import { ParametersKF, RuntimeConfigParamValue } from '#~/concepts/pipelines/kfTypes';
import FormSection from '#~/components/pf-overrides/FormSection';
import { HyperParametersFormData } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/hyperparameterValidationUtils';
import HyperparameterFieldsDisplay from '#~/pages/pipelines/global/modelCustomization/hyperparameterSection/HyperparameterFields';

type HyperparameterPageSectionProps = {
  hyperparameters: ParametersKF;
  data: HyperParametersFormData;
  setData: (hyperparameters: HyperParametersFormData) => void;
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
      description="Configure advanced settings for this run."
      data-testid={FineTunePageSections.HYPERPARAMETERS}
    >
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
          data={data}
          onChange={(hyperparameter: string, hyperparameterValue?: RuntimeConfigParamValue) => {
            setData({
              ...data,
              [hyperparameter]: hyperparameterValue,
            });
          }}
        />
      </ExpandableSection>
    </FormSection>
  );
};
export default HyperparameterPageSection;

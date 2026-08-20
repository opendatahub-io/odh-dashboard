import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '@odh-dashboard/ui-core/utilities';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { ValidatedArgumentsSection } from '../fields/validatedConfigurations/ValidatedArgumentsSection';
import { hasValidatedConfigurationOptions } from '../fields/validatedConfigurations/validatedConfigurationUtils';
import { getDeployWizardNavState } from '../../../shared/tracking/deployWizardTracking';

type PreconfigureDeploymentStepProps = {
  wizardState: UseModelDeploymentWizardState;
};

const projectHelp = `This is the ${ODH_PRODUCT_NAME} project where the model will be deployed.`;

export const PreconfigureDeploymentStepContent: React.FC<PreconfigureDeploymentStepProps> = ({
  wizardState,
}) => {
  const { initialProjectName, projectName, setProjectName } = wizardState.state.project;
  const validatedConfigurations = wizardState.initialData?.validatedConfigurations ?? [];
  const location = useLocation();
  const navState = getDeployWizardNavState(location.state);
  const showValidatedArgumentsSection = hasValidatedConfigurationOptions(validatedConfigurations);

  return (
    <Form>
      <HelperText>
        <HelperTextItem>Choose from the below options to configure your deployment.</HelperTextItem>
      </HelperText>
      <FormGroup
        label="Project"
        fieldId="preconfigure-project-selector"
        isRequired
        labelHelp={
          <Popover bodyContent={projectHelp}>
            <OutlinedQuestionCircleIcon />
          </Popover>
        }
      >
        {initialProjectName ? (
          <TextInput
            id="preconfigure-project-name"
            value={projectName}
            isDisabled
            data-testid="preconfigure-project-name"
          />
        ) : (
          <ProjectSelector
            onSelection={(name: string) => setProjectName(name)}
            namespace={projectName ?? ''}
            isFullWidth
            placeholder="Select a project"
          />
        )}
      </FormGroup>
      {showValidatedArgumentsSection && (
        <ValidatedArgumentsSection
          configurations={validatedConfigurations}
          selection={wizardState.state.validatedConfigurationSelection}
          runtimeArgs={wizardState.state.runtimeArgs}
          catalogModelId={navState.catalogModelId}
        />
      )}
    </Form>
  );
};

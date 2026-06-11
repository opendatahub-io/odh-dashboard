import React from 'react';
import {
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '@odh-dashboard/internal/utilities/const';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

type PreconfigureDeploymentStepProps = {
  wizardState: UseModelDeploymentWizardState;
};

const projectHelp = `This is the ${ODH_PRODUCT_NAME} project where the model will be deployed.`;

export const PreconfigureDeploymentStepContent: React.FC<PreconfigureDeploymentStepProps> = ({
  wizardState,
}) => {
  const { initialProjectName, projectName, setProjectName } = wizardState.state.project;

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
    </Form>
  );
};

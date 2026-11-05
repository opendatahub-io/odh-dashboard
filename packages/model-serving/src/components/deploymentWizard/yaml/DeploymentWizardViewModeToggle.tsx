import React from 'react';
import {
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type DeploymentWizardViewModeToggleProps = {
  isYamlEmpty: boolean;
  viewMode: ModelDeploymentWizardViewMode;
  switchToForm: (updateFormWithYaml: boolean) => void;
  switchToYaml: () => void;
  yamlErrors: Error[];
  canUpdateFormFromYaml: boolean;
};

export const DeploymentWizardViewModeToggle: React.FC<DeploymentWizardViewModeToggleProps> = ({
  isYamlEmpty,
  viewMode,
  switchToForm,
  switchToYaml,
  yamlErrors,
  canUpdateFormFromYaml,
}) => {
  const [isBidirectionalYamlWizardGaEnabled] = useFeatureFlag('bidirectionalYamlWizardGa');
  const [isYamlErrorsModalOpen, setIsYamlErrorsModalOpen] = React.useState(false);

  return (
    <Flex>
      {isBidirectionalYamlWizardGaEnabled ? null : (
        <FlexItem>
          <Label isCompact color="yellow" variant="outline">
            YAML feature is in tech preview
          </Label>
        </FlexItem>
      )}
      <FlexItem>
        <ToggleGroup aria-label="Deployment view mode">
          <ToggleGroupItem
            data-testid="form-view"
            text="Form"
            buttonId="form-view"
            isSelected={viewMode === 'form'}
            onChange={() => {
              if (viewMode === 'yaml-edit' && !isYamlEmpty && yamlErrors.length > 0) {
                setIsYamlErrorsModalOpen(true);
              } else {
                switchToForm(viewMode === 'yaml-edit');
              }
            }}
            isDisabled={isBidirectionalYamlWizardGaEnabled ? false : viewMode === 'yaml-edit'}
          />
          <ToggleGroupItem
            data-testid="yaml-view"
            text="YAML"
            buttonId="yaml-view"
            isSelected={viewMode !== 'form'}
            onChange={() => {
              if (viewMode === 'form') {
                switchToYaml();
              }
            }}
          />
        </ToggleGroup>
      </FlexItem>
      {isYamlErrorsModalOpen ? (
        <ContentModal
          dataTestId="yaml-errors-modal"
          title="Switch to form with YAML errors?"
          titleIconVariant="warning"
          variant="small"
          onClose={() => setIsYamlErrorsModalOpen(false)}
          description={
            canUpdateFormFromYaml
              ? 'Continue with the inputs that could be read from YAML, or use your saved form inputs.'
              : 'The inputs could not be read from this YAML. Use your saved form inputs or stay in YAML mode.'
          }
          contents={
            <List>
              {yamlErrors.map((error, index) => (
                <ListItem key={`${index}-${error.message}`}>{error.message}</ListItem>
              ))}
            </List>
          }
          buttonActions={[
            ...(canUpdateFormFromYaml
              ? [
                  {
                    label: 'Force continue',
                    variant: 'danger' as const,
                    dataTestId: 'force-continue-to-form',
                    onClick: () => {
                      setIsYamlErrorsModalOpen(false);
                      switchToForm(true);
                    },
                  },
                ]
              : []),
            {
              label: 'Use saved form inputs',
              variant: 'secondary',
              dataTestId: 'use-saved-form-inputs',
              onClick: () => {
                setIsYamlErrorsModalOpen(false);
                switchToForm(false);
              },
            },
            {
              label: 'Cancel',
              variant: 'link',
              dataTestId: 'cancel-switch-to-form',
              onClick: () => setIsYamlErrorsModalOpen(false),
            },
          ]}
        />
      ) : null}
    </Flex>
  );
};

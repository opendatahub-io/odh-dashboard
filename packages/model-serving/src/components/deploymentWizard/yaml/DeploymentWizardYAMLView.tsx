import React from 'react';
import { Language, CodeEditor } from '@patternfly/react-code-editor';
import {
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Tooltip,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';
import { stringify } from 'yaml';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';
import { EnterYAMLEditModal } from './EnterYAMLEditModal';
import type { Deployment } from '../../../../extension-points';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type DeploymentWizardYAMLViewProps = {
  code?: string;
  setCode: (code: string) => void;
  viewMode: ModelDeploymentWizardViewMode;
  setViewMode: (viewMode: ModelDeploymentWizardViewMode) => void;
  canEnterYAMLEditMode: boolean;
  existingDeployment?: Deployment;
  isAutoFallback?: boolean;
};

export const DeploymentWizardYAMLView: React.FC<DeploymentWizardYAMLViewProps> = ({
  code,
  setCode,
  viewMode,
  setViewMode,
  canEnterYAMLEditMode = true,
  existingDeployment,
  isAutoFallback,
}) => {
  const { theme } = useThemeContext();

  const [isEnterYAMLEditModalOpen, setIsEnterYAMLEditModalOpen] = React.useState(false);

  const displayYaml = React.useMemo(() => {
    if (isAutoFallback && existingDeployment) {
      return stringify(existingDeployment.model);
    }
    return code;
  }, [isAutoFallback, existingDeployment, code]);

  return (
    <Stack hasGutter style={{ height: '100%' }}>
      {isAutoFallback && (
        <StackItem>
          <Alert
            variant={AlertVariant.info}
            isInline
            title="YAML edit mode"
            data-testid="yaml-fallback-alert"
          >
            <p>
              This deployment contains custom configuration that cannot be displayed in the form.
              You can edit it directly in YAML below.
            </p>
          </Alert>
        </StackItem>
      )}
      {viewMode === 'yaml-preview' && !isAutoFallback && (
        <StackItem>
          <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
            <FlexItem>
              {canEnterYAMLEditMode ? (
                <Button
                  variant="primary"
                  data-testid="manual-edit-mode-button"
                  onClick={() => setIsEnterYAMLEditModalOpen(true)}
                >
                  Enter Manual Edit Mode
                </Button>
              ) : (
                <Tooltip content="Edit is not supported.">
                  <Button variant="primary" data-testid="manual-edit-mode-button" isAriaDisabled>
                    Enter Manual Edit Mode
                  </Button>
                </Tooltip>
              )}
            </FlexItem>
          </Flex>
        </StackItem>
      )}
      <StackItem isFilled data-testid="yaml-editor">
        <CodeEditor
          emptyState={
            viewMode === 'yaml-preview' ? (
              <Bullseye>
                <EmptyState
                  icon={CodeIcon}
                  headingLevel="h4"
                  titleText="Auto-generated YAML unavailable"
                  data-testid="yaml-editor-empty-state"
                >
                  <EmptyStateBody>
                    YAML generation is currently supported only for the LLM-d serving runtime.
                    Select the LLM-d runtime to generate a preview, or manually enter your YAML
                    configuration.
                  </EmptyStateBody>
                </EmptyState>
              </Bullseye>
            ) : undefined
          }
          code={displayYaml}
          onChange={setCode}
          language={Language.yaml}
          isDarkTheme={theme === 'dark'}
          isLanguageLabelVisible
          isFullHeight
          isReadOnly={viewMode === 'yaml-preview' && !isAutoFallback}
          isCopyEnabled
          isDownloadEnabled
          onEditorDidMount={(editor) => {
            editor.focus();
          }}
        />
      </StackItem>
      {isEnterYAMLEditModalOpen && (
        <EnterYAMLEditModal
          onClose={() => setIsEnterYAMLEditModalOpen(false)}
          onConfirm={() => {
            setIsEnterYAMLEditModalOpen(false);
            setViewMode('yaml-edit');
          }}
        />
      )}
    </Stack>
  );
};

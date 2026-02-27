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
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';
import { EnterYAMLEditModal } from './EnterYAMLEditModal';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type DeploymentWizardYAMLViewProps = {
  code?: string;
  setCode: (code: string) => void;
  viewMode: ModelDeploymentWizardViewMode;
  setViewMode: (viewMode: ModelDeploymentWizardViewMode) => void;
  canEnterYAMLEditMode: boolean;
};

export const DeploymentWizardYAMLView: React.FC<DeploymentWizardYAMLViewProps> = ({
  code,
  setCode,
  viewMode,
  setViewMode,
  canEnterYAMLEditMode = true,
}) => {
  const { theme } = useThemeContext();

  const [isEnterYAMLEditModalOpen, setIsEnterYAMLEditModalOpen] = React.useState(false);

  return (
    <Stack hasGutter style={{ height: '100%' }}>
      {viewMode === 'yaml-preview' && (
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
          code={code}
          onChange={setCode}
          language={Language.yaml}
          isDarkTheme={theme === 'dark'}
          isLanguageLabelVisible
          isFullHeight
          isReadOnly={viewMode === 'yaml-preview'}
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

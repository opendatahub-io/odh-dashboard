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

type DeploymentWizardYAMLViewProps = {
  code?: string;
  setCode: (code: string) => void;
  viewMode: 'form' | 'yaml-preview' | 'yaml-edit';
  setViewMode: (viewMode: 'form' | 'yaml-preview' | 'yaml-edit') => void;
};

export const DeploymentWizardYAMLView: React.FC<DeploymentWizardYAMLViewProps> = ({
  code,
  setCode,
  viewMode,
  setViewMode,
}) => {
  const { theme } = useThemeContext();

  const [isEnterYAMLEditModalOpen, setIsEnterYAMLEditModalOpen] = React.useState(false);

  return (
    <Stack hasGutter style={{ height: '100%' }}>
      {viewMode === 'yaml-preview' && (
        <StackItem>
          <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
            <FlexItem>
              <Tooltip content="Edit is not supported.">
                <Button
                  variant="primary"
                  data-testid="manual-edit-mode-button"
                  // isAriaDisabled
                  onClick={() => setIsEnterYAMLEditModalOpen(true)}
                >
                  Enter Manual Edit Mode
                </Button>
              </Tooltip>
            </FlexItem>
          </Flex>
        </StackItem>
      )}
      <StackItem isFilled data-testid="yaml-editor">
        <CodeEditor
          emptyState={
            <Bullseye>
              <EmptyState
                icon={CodeIcon}
                headingLevel="h4"
                titleText="Auto-generated YAML unavailable"
                data-testid="yaml-editor-empty-state"
              >
                <EmptyStateBody>
                  YAML generation is currently supported only for the LLM-d serving runtime. Select
                  the LLM-d runtime to generate a preview, or manually enter your YAML
                  configuration.
                </EmptyStateBody>
              </EmptyState>
            </Bullseye>
          }
          code={code}
          onCodeChange={setCode}
          language={Language.yaml}
          isDarkTheme={theme === 'dark'}
          isLanguageLabelVisible
          isFullHeight
          isReadOnly={viewMode === 'yaml-preview'}
          isCopyEnabled
          isDownloadEnabled
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

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

type DeploymentWizardYAMLViewProps = {
  code?: string;
  setCode: (code: string) => void;
};

export const DeploymentWizardYAMLView: React.FC<DeploymentWizardYAMLViewProps> = ({
  code,
  setCode,
}) => {
  const { theme } = useThemeContext();

  return (
    <Stack hasGutter>
      <StackItem>
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
          <FlexItem>
            <Tooltip content="Edit is not supported.">
              <Button variant="primary" data-testid="manual-edit-mode-button" isAriaDisabled>
                Enter Manual Edit Mode
              </Button>
            </Tooltip>
          </FlexItem>
        </Flex>
      </StackItem>
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
          isReadOnly
          isCopyEnabled
          isDownloadEnabled
        />
      </StackItem>
    </Stack>
  );
};

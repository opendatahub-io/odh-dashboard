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
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';

type DeploymentWizardYAMLViewProps = {
  code?: string;
  setCode: (code: string) => void;
};

export const DeploymentWizardYAMLView: React.FC<DeploymentWizardYAMLViewProps> = ({
  code,
  setCode,
}) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
          <FlexItem>
            <Button variant="primary" data-testid="manual-edit-mode-button">
              Enter Manual Edit Mode
            </Button>
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
                titleText="No YAML available"
                data-testid="yaml-editor-empty-state"
              >
                <EmptyStateBody>Continue in the form, or select Manual Edit Mode.</EmptyStateBody>
              </EmptyState>
            </Bullseye>
          }
          code={code}
          onCodeChange={setCode}
          language={Language.yaml}
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

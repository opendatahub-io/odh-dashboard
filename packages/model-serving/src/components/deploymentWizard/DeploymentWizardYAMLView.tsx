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

export const DeploymentWizardYAMLView: React.FC = () => {
  const [code, setCode] = React.useState('');

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
      <StackItem>
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
          data-testid="yaml-editor"
          code={code}
          onCodeChange={setCode}
          language={Language.yaml}
          isLanguageLabelVisible
        />
      </StackItem>
    </Stack>
  );
};

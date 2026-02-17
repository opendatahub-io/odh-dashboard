import React from 'react';
import { Language } from '@patternfly/react-code-editor';
import { Stack, StackItem, Flex, FlexItem, Button } from '@patternfly/react-core';
import DashboardCodeEditor from '@odh-dashboard/internal/concepts/dashboard/codeEditor/DashboardCodeEditor';

export const DeploymentWizardYAMLView: React.FC = () => {
  const code =
    '# Continue filling out the form to preview YAML, or enter Manual Edit Mode to write YAML directly\n';

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
        <DashboardCodeEditor
          testId="yaml-editor"
          code={code}
          language={Language.yaml}
          isReadOnly
          isLineNumbersVisible
          isLanguageLabelVisible
          codeEditorHeight="500px"
        />
      </StackItem>
    </Stack>
  );
};

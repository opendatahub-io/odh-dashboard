import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type TrustyAITimedOutErrorProps = {
  ignoreTimedOut: () => void;
  deleteCR: () => Promise<unknown>;
};
const TrustyAITimedOutError: React.FC<TrustyAITimedOutErrorProps> = ({
  ignoreTimedOut,
  deleteCR,
}) => (
  <Alert
    variant="danger"
    isInline
    data-testid="trustyai-service-timeout-error"
    title="TrustyAI failed"
    actionClose={<AlertActionCloseButton onClose={() => ignoreTimedOut()} />}
    actionLinks={
      <>
        <AlertActionLink onClick={() => deleteCR()}>Uninstall TrustyAI</AlertActionLink>
        <AlertActionLink onClick={() => ignoreTimedOut()}>Close</AlertActionLink>
      </>
    }
  >
    <Stack hasGutter>
      <StackItem>
        An error occurred while installing or loading TrustyAI. To continue, uninstall and reinstall
        TrustyAI. Uninstalling this service will delete all of its resources, including model bias
        configurations.
      </StackItem>
      <StackItem>For help, contact your administrator.</StackItem>
    </Stack>
  </Alert>
);

export default TrustyAITimedOutError;

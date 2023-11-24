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
    title="TrustyAI service failed"
    actionClose={<AlertActionCloseButton onClose={() => ignoreTimedOut()} />}
    actionLinks={
      <>
        <AlertActionLink onClick={() => deleteCR()}>Delete TrustyAI service</AlertActionLink>
        <AlertActionLink onClick={() => ignoreTimedOut()}>Close</AlertActionLink>
      </>
    }
  >
    <Stack hasGutter>
      <StackItem>
        We encountered an error creating or loading your TrustyAI service. To continue, delete this
        service and create a new one. Deleting this service will delete all of its resources,
        including bias configurations.
      </StackItem>
      <StackItem>To get help contact your administrator.</StackItem>
    </Stack>
  </Alert>
);

export default TrustyAITimedOutError;

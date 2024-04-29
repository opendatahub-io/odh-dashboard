import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';

type EmptyRegisteredModelsType = {
  rmName?: string;
};

const EmptyModelVersions: React.FC<EmptyRegisteredModelsType> = ({ rmName }) => (
  <EmptyState variant={EmptyStateVariant.full} data-testid="no-model-versions">
    <EmptyStateHeader titleText="No versions" icon={<EmptyStateIcon icon={PlusCircleIcon} />} />
    <EmptyStateBody>
      {rmName} has no versions registered to it. Register a version to this
      <br />
      model.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button
          data-testid="register-new-version"
          variant={ButtonVariant.primary}
          //   TODO: enter OnClick function
        >
          Register new version
        </Button>
      </EmptyStateActions>
      <Button variant="link">View archived versions</Button>
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyModelVersions;

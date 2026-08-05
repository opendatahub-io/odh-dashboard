import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';

type AddConfigLinkProps = Omit<React.ComponentProps<typeof Link>, 'to'>;

// Defined at module scope so the Button's element type stays referentially stable.
const AddConfigLink: React.FC<AddConfigLinkProps> = (props) => <Link {...props} to="add" />;

/**
 * Empty state for the accelerator configurations list. Carries its own add action
 * so administrators can create the first configuration — the list toolbar that
 * normally hosts that button is not rendered while the list is empty.
 */
const LlmAcceleratorConfigEmptyState: React.FC = () => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h2"
      icon={PlusCircleIcon}
      titleText="No LLM accelerator configurations"
      variant={EmptyStateVariant.lg}
      data-testid="llm-accelerator-configs-empty-state"
    >
      <EmptyStateBody>
        No accelerator configurations have been added yet. Add one to make it available in the
        deployment wizard.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            data-testid="add-accelerator-config-button"
            component={AddConfigLink}
          >
            Add LLM accelerator configuration
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default LlmAcceleratorConfigEmptyState;

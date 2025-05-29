import React from 'react';
import {
  EmptyStateBody,
  EmptyState,
  PageSection,
  EmptyStateVariant,
  StackItem,
  Stack,
  Button,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

const LMEvalTab: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h6"
        icon={SearchIcon}
        titleText="No evaluations on this model"
        variant={EmptyStateVariant.lg}
      >
        <EmptyStateBody>
          You need to evaluate this model before any results will be shown here.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={() => navigate('/lmEval/evaluate')}>
              Evaluate
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  );
};

export default LMEvalTab;

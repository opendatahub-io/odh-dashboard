import {
  PageSection,
  EmptyState,
  EmptyStateVariant,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { experimentsBaseRoute, experimentsManageCompareRunsRoute } from '~/routes';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

type CompareRunsInvalidRunCountProps = {
  runs: PipelineRunKFv2[];
};

export const CompareRunsInvalidRunCount: React.FC<CompareRunsInvalidRunCountProps> = ({ runs }) => {
  const navigate = useNavigate();
  const { namespace, experimentId } = useParams();

  if (!namespace || !experimentId) {
    navigate(experimentsBaseRoute(namespace));
    return null;
  }

  return (
    <PageSection isFilled data-testid="compare-runs-invalid-number-runs">
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText="Invalid number of pipeline runs selected"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h1"
        />
        <EmptyStateBody>Please select between 1 and 10 runs to compare</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              onClick={() =>
                navigate(
                  experimentsManageCompareRunsRoute(
                    namespace,
                    experimentId,
                    runs.map((r) => r.run_id),
                  ),
                )
              }
            >
              Add runs
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  );
};

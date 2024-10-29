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
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';

type CompareRunsInvalidRunCountProps = {
  runs: PipelineRunKF[];
};

export const CompareRunsInvalidRunCount: React.FC<CompareRunsInvalidRunCountProps> = ({ runs }) => {
  const navigate = useNavigate();
  const { namespace, experimentId } = useParams();

  if (!namespace || !experimentId) {
    navigate(experimentsBaseRoute(namespace));
    return null;
  }

  const title =
    runs.length > 10 ? 'Too many runs selected' : runs.length === 0 ? 'No runs selected' : null;
  const description =
    runs.length > 10
      ? 'More than 10 runs have been selected for comparison. Select up to 10 runs to compare, and try again.'
      : runs.length === 0
      ? 'No runs have been selected for comparison. Select between 1 and 10 runs to compare, and try again.'
      : null;

  if (!title || !description) {
    return null;
  }

  return (
    <PageSection isFilled data-testid="compare-runs-invalid-number-runs">
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText={title}
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h1"
        />
        <EmptyStateBody>{description}</EmptyStateBody>
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
              {runs.length === 0 ? 'Add runs' : 'Manage runs'}
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  );
};

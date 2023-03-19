import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportPipelineButton from '~/concepts/pipelines/import/ImportPipelineButton';
import ExternalLink from '~/components/ExternalLink';

const GlobalNoPipelines: React.FC = () => (
  <EmptyState>
    <EmptyStateIcon icon={PlusCircleIcon} />
    <Title headingLevel="h4" size="lg">
      No pipelines yet
    </Title>
    <EmptyStateBody>
      To get started, import a pipeline, or create one using the Jupyter visual editor, for help
      creating a pipeline, access the [quick start (icon)].
      {/* TODO: What quick start? */}
    </EmptyStateBody>
    <ImportPipelineButton variant="primary" />
    <EmptyStateSecondaryActions>
      {/* TODO: Get a real link */}
      <ExternalLink text="Learn more about creating pipelines" to="https://opendatahub.io" />
    </EmptyStateSecondaryActions>
  </EmptyState>
);

export default GlobalNoPipelines;

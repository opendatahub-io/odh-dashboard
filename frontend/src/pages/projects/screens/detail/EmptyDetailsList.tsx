import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

type EmptyDetailsListProps = {
  title: string;
  description: string;
};

const EmptyDetailsList: React.FC<EmptyDetailsListProps> = ({ title, description }) => {
  return (
    <EmptyState variant="xs">
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h5" size="lg">
        {title}
      </Title>
      <EmptyStateBody>{description}</EmptyStateBody>
    </EmptyState>
  );
};

export default EmptyDetailsList;

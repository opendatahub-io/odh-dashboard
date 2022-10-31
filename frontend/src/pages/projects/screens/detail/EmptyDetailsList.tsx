import * as React from 'react';
import { Divider, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

type EmptyDetailsListProps = {
  title: string;
  description: string;
  includeDivider?: boolean;
};

const EmptyDetailsList: React.FC<EmptyDetailsListProps> = ({
  title,
  description,
  includeDivider,
}) => {
  return (
    <>
      <EmptyState variant="xs">
        <EmptyStateIcon icon={CubesIcon} />
        <Title headingLevel="h5" size="lg">
          {title}
        </Title>
        <EmptyStateBody>{description}</EmptyStateBody>
      </EmptyState>
      {includeDivider && <Divider />}
    </>
  );
};

export default EmptyDetailsList;

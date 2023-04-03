import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

type InvalidProjectProps = {
  title?: string;
  namespace?: string;
  navigateTo: string;
  navigateText: string;
};

const InvalidProject: React.FC<InvalidProjectProps> = ({
  namespace,
  title,
  navigateTo,
  navigateText,
}) => {
  const navigate = useNavigate();

  return (
    <EmptyState>
      <EmptyStateIcon icon={ExclamationCircleIcon} />
      <Title headingLevel="h4" size="lg">
        {title || 'Invalid project'}
      </Title>
      <EmptyStateBody>Project {namespace ? `"${namespace}" ` : ''}not found.</EmptyStateBody>
      <Button variant="primary" onClick={() => navigate(navigateTo)}>
        {navigateText}
      </Button>
    </EmptyState>
  );
};

export default InvalidProject;

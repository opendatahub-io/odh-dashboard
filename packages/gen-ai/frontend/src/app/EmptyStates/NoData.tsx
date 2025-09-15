import React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

type NoDataProps = {
  title: string;
  description: React.ReactNode;
  actionButtonText: string;
  handleActionButtonClick: () => void;
};

const NoData: React.FC<NoDataProps> = ({
  title,
  description,
  actionButtonText,
  handleActionButtonClick,
}) => (
  <EmptyState
    titleText={title}
    icon={() => <img src={emptyStateImage} alt="Chat Playground Infrastructure" />}
    variant="lg"
    isFullHeight
  >
    <EmptyStateBody>
      {description}
      <EmptyStateFooter>
        <Button variant="primary" onClick={handleActionButtonClick}>
          {actionButtonText}
        </Button>
      </EmptyStateFooter>
    </EmptyStateBody>
  </EmptyState>
);

export default NoData;

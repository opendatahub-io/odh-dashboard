import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';

type EmptyDetailsViewProps = {
  title?: string;
  description?: string;
  iconImage?: string;
  imageAlt?: string;
  allowCreate?: boolean;
  createButton?: React.ReactNode;
  imageSize?: string;
};

const EmptyDetailsView: React.FC<EmptyDetailsViewProps> = ({
  title,
  description,
  iconImage,
  imageAlt,
  allowCreate = true,
  createButton,
  imageSize = '320px',
}) => (
  <EmptyState variant="lg">
    <EmptyStateHeader
      data-testid="empty-state-title"
      titleText={title}
      icon={
        iconImage ? (
          <EmptyStateIcon
            icon={() => <img style={{ height: imageSize }} src={iconImage} alt={imageAlt} />}
          />
        ) : undefined
      }
      headingLevel="h3"
    />
    <EmptyStateBody>{description}</EmptyStateBody>
    {allowCreate && createButton ? (
      <EmptyStateFooter>
        <EmptyStateActions>{createButton}</EmptyStateActions>
      </EmptyStateFooter>
    ) : null}
  </EmptyState>
);

export default EmptyDetailsView;

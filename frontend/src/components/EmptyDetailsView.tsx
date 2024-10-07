import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
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
  <EmptyState
    headingLevel="h3"
    titleText={title}
    variant="lg"
    icon={
      iconImage
        ? () => <img style={{ height: imageSize }} src={iconImage} alt={imageAlt} />
        : undefined
    }
  >
    <EmptyStateBody>{description}</EmptyStateBody>
    {allowCreate && createButton ? (
      <EmptyStateFooter>
        <EmptyStateActions>{createButton}</EmptyStateActions>
      </EmptyStateFooter>
    ) : null}
  </EmptyState>
);

export default EmptyDetailsView;

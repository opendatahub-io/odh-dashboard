import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';

import './EmptyDetailsView.scss';

type EmptyDetailsViewProps = {
  title?: string;
  description?: string;
  iconImage?: string;
  allowCreate: boolean;
  createButton?: React.ReactNode;
};

const EmptyDetailsView: React.FC<EmptyDetailsViewProps> = ({
  title,
  description,
  iconImage,
  allowCreate,
  createButton,
}) => (
  <EmptyState className="odh-empty-details" variant="lg">
    <EmptyStateHeader
      titleText={<>{title}</>}
      icon={
        iconImage ? (
          <EmptyStateIcon icon={() => <img style={{ height: '320px' }} src={iconImage} />} />
        ) : undefined
      }
      headingLevel="h3"
    />
    <EmptyStateBody>{description}</EmptyStateBody>
    <div className="odh-empty-details__spacer" />
    {allowCreate ? (
      <EmptyStateFooter>
        <EmptyStateActions>{createButton}</EmptyStateActions>
      </EmptyStateFooter>
    ) : null}
  </EmptyState>
);

export default EmptyDetailsView;

import React from 'react';
import { QuestionCircleIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import {
  PageSection,
  PageSectionVariants,
  TextContent,
  Text,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  Spinner,
  Title,
  EmptyStateBody,
} from '@patternfly/react-core';

import './ApplicationsPage.scss';

type ApplicationsPageProps = {
  title: string;
  description: React.ReactNode;
  loaded: boolean;
  empty: boolean;
  loadError?: Error;
};

const ApplicationsPage: React.FC<ApplicationsPageProps> = ({
  title,
  description,
  loaded,
  empty,
  loadError,
  children,
}) => {
  const renderHeader = () => (
    <PageSection className="odh-apps__heading" variant={PageSectionVariants.light}>
      <TextContent className="odh-apps__heading__text">
        <Text component="h1">{title}</Text>
        <Text component="p">{description}</Text>
      </TextContent>
    </PageSection>
  );

  const renderContents = () => {
    if (loadError) {
      return (
        <PageSection>
          <EmptyState variant={EmptyStateVariant.full} data-test-id="error-empty-state">
            <EmptyStateIcon icon={WarningTriangleIcon} />
            <Title headingLevel="h5" size="lg">
              Error loading components
            </Title>
            <EmptyStateBody className="odh-dashboard__error-body">
              <div>
                <code className="odh-dashboard__display-error">{loadError.message}</code>
              </div>
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (!loaded) {
      return (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.full} data-test-id="loading-empty-state">
            <Spinner size="xl" />
            <Title headingLevel="h5" size="lg">
              Loading
            </Title>
          </EmptyState>
        </PageSection>
      );
    }

    if (empty) {
      return (
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.full} data-test-id="empty-empty-state">
            <EmptyStateIcon icon={QuestionCircleIcon} />
            <Title headingLevel="h5" size="lg">
              No Components Found
            </Title>
          </EmptyState>
        </PageSection>
      );
    }

    return children;
  };

  return (
    <>
      {renderHeader()}
      {renderContents()}
    </>
  );
};

export default ApplicationsPage;

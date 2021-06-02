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
  description: string;
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
  const renderContents = () => {
    if (loadError) {
      return (
        <PageSection>
          <EmptyState variant={EmptyStateVariant.full}>
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
        <PageSection>
          <EmptyState variant={EmptyStateVariant.full}>
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
        <PageSection>
          <EmptyState variant={EmptyStateVariant.full}>
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
      <PageSection className="odh-apps__heading" variant={PageSectionVariants.light}>
        <TextContent className="odh-apps__heading__text">
          <Text component="h1">{title}</Text>
          <Text component="p">{description}</Text>
        </TextContent>
      </PageSection>
      {renderContents()}
    </>
  );
};

export default ApplicationsPage;

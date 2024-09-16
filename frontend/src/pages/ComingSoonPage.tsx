import * as React from 'react';
import { PageSection, Stack, StackItem, Title } from '@patternfly/react-core';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import ProjectSelectorNavigator from '~/concepts/projects/ProjectSelectorNavigator';

type ComingSoonPageProps = {
  title: string;
  namespaced?: boolean;
  path?: string;
};

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, namespaced, path }) => (
  <PageSection aria-label="details-section" variant="light">
    <Stack hasGutter>
      {namespaced ? (
        <StackItem>
          <ProjectSelectorNavigator
            getRedirectPath={(ns) => `/projects/${ns}/${path}`}
            showTitle
            invalidDropdownPlaceholder="Select project"
          />
        </StackItem>
      ) : null}
      <StackItem>
        <Title headingLevel="h2" size="xl">
          {title}
        </Title>
      </StackItem>
      <StackItem isFilled>
        <EmptyDetailsView
          title="This page is coming soon."
          description="Not yet implemented"
          imageAlt="coming soon"
        />
      </StackItem>
    </Stack>
  </PageSection>
);

export default ComingSoonPage;

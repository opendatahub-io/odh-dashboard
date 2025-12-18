import * as React from 'react';
import { StackItem, Alert, PageSection, Stack } from '@patternfly/react-core';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';

const ProjectPermissions: React.FC = () => {
  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-permissions-page-section"
      id={ProjectSectionID.PERMISSIONS}
    >
      <Stack hasGutter>
        <Alert variant="warning" title="Warning" isInline>
          Changing user or group permissions may remove their access to this resource.
        </Alert>
        <StackItem>{/* TODO: Add roles table */}</StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProjectPermissions;

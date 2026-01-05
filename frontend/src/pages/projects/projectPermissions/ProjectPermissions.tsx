import * as React from 'react';
import { StackItem, Alert, PageSection, Stack, Spinner, Bullseye } from '@patternfly/react-core';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';

const ProjectPermissions: React.FC = () => {
  const { loaded, error } = usePermissionsContext();

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
        {!loaded ? (
          <StackItem>
            <Bullseye style={{ minHeight: 150 }}>
              <Spinner />
            </Bullseye>
          </StackItem>
        ) : error ? (
          <StackItem>
            <Alert variant="danger" title="Unable to load permissions data" isInline>
              {error.message}
            </Alert>
          </StackItem>
        ) : (
          <StackItem>{/* TODO: Add roles table */}</StackItem>
        )}
      </Stack>
    </PageSection>
  );
};

export default ProjectPermissions;

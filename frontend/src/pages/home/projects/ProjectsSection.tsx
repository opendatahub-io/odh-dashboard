import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  PageSection,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import ManageProjectModal from '~/pages/projects/screens/projects/ManageProjectModal';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessReview } from '~/api';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import EmptyProjectsCard from './EmptyProjectsCard';
import ProjectsLoading from './ProjectsLoading';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const ProjectsSection: React.FC = () => {
  const navigate = useNavigate();

  const { status: projectsAvailable } = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW);
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);
  const [createProjectOpen, setCreateProjectOpen] = React.useState<boolean>(false);

  if (!projectsAvailable) {
    return null;
  }

  const onCreateProject = () => setCreateProjectOpen(true);

  return (
    <PageSection data-testid="landing-page-projects">
      <Stack hasGutter>
        <StackItem>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <HeaderIcon type={ProjectObjectType.project} sectionType={SectionType.organize} />
            </FlexItem>
            <FlexItem>
              <TextContent>
                <Text component={TextVariants.h1}>Projects</Text>
              </TextContent>
            </FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          {!rbacLoaded ? (
            <ProjectsLoading />
          ) : (
            <EmptyProjectsCard allowCreate={allowCreate} onCreateProject={onCreateProject} />
          )}
        </StackItem>
        <StackItem>
          <Button component="a" isInline variant="link" onClick={() => navigate('/projects')}>
            Go to <b>Projects</b>
          </Button>
        </StackItem>
      </Stack>
      {createProjectOpen ? (
        <ManageProjectModal
          open
          onClose={(newProjectName) => {
            if (newProjectName) {
              navigate(`/projects/${newProjectName}`);
              return;
            }
            setCreateProjectOpen(false);
          }}
        />
      ) : null}
    </PageSection>
  );
};

export default ProjectsSection;

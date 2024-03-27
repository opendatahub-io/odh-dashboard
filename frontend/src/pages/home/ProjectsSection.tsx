import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Split,
  Stack,
  TextContent,
  Text,
  PageSectionProps,
  PageSection,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import getStartedImage from '~/images/AI_ML-illustration-Blog-thumbnail 1.svg';
import ManageProjectModal from '~/pages/projects/screens/projects/ManageProjectModal';

type ProjectsSectionProps = PageSectionProps & {
  allowCreate: boolean;
};

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ allowCreate, ...rest }) => {
  const navigate = useNavigate();
  const [createProjectOpen, setCreateProjectOpen] = React.useState<boolean>(false);

  if (!allowCreate) {
    return null;
  }

  return (
    <PageSection data-testid="landing-page-projects" {...rest}>
      <Card>
        <CardBody>
          <Flex
            gap={{ default: 'gapLg' }}
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'wrap', sm: 'nowrap' }}
          >
            <FlexItem flex={{ default: 'flexNone' }}>
              <img src={getStartedImage} alt="" style={{ width: 320 }} />
            </FlexItem>
            <FlexItem>
              <Stack hasGutter>
                <TextContent>
                  <Text component="h1">Start by creating your project</Text>
                  <Text component="p">
                    From workbenches to model servers, your data science project can be organized
                    and customized to meet your needs.
                  </Text>
                </TextContent>
                <Split>
                  <Button
                    variant="primary"
                    icon={<ArrowRightIcon />}
                    iconPosition="right"
                    onClick={() => setCreateProjectOpen(true)}
                  >
                    Create a project
                  </Button>
                </Split>
              </Stack>
            </FlexItem>
          </Flex>
        </CardBody>
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
      </Card>
    </PageSection>
  );
};

export default ProjectsSection;

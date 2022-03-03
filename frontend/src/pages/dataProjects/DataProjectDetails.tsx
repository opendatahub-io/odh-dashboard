import * as React from 'react';
import {
  PageSection,
  Title,
  Button,
  Flex,
  FlexItem,
  Breadcrumb,
  BreadcrumbItem,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { projects } from './mockData';

import { useParams, Redirect } from 'react-router-dom';
import EnvironmentModal from './EnvironmentModal';
import EnvironmentCard from './EnvironmentCard';
import './DataProjects.scss';

const description = `View and edit data project and environment details.`;

export const DataProjectDetails: React.FC = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const isLoaded = true;
  const [isCreateEnvironmentModalOpen, setCreateEnvironmentModalOpen] = React.useState(false);
  const [activeEnvironment, setActiveEnvironment] = React.useState(null);

  const project = projects.find((project) => project.metadata.name === projectName);

  if (!project) {
    return <Redirect to="/data-projects" />;
  }

  const handleCreateEnvironmentModalClose = () => {
    setCreateEnvironmentModalOpen(false);
  };

  return (
    <>
      <Breadcrumb className="odh-data-projects__breadcrumb">
        <BreadcrumbItem to="/data-projects">Data Projects</BreadcrumbItem>
        <BreadcrumbItem isActive>{project.metadata.name}</BreadcrumbItem>
      </Breadcrumb>
      <ApplicationsPage
        title={project.metadata.name + ' Details'}
        description={description}
        loaded={isLoaded}
        empty={false}
      >
        <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
          <div className="odh-data-projects__details">
            <Flex>
              <FlexItem>
                <Title headingLevel="h3" size="lg">
                  Environments
                </Title>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveEnvironment(null);
                    setCreateEnvironmentModalOpen(true);
                  }}
                >
                  Create environment
                </Button>
              </FlexItem>
            </Flex>
            {project.spec.environments
              ? project.spec.environments.map((environment) => (
                  <EnvironmentCard
                    key={environment.name}
                    environment={environment}
                    setModalOpen={setCreateEnvironmentModalOpen}
                    setActiveEnvironment={setActiveEnvironment}
                  />
                ))
              : null}
          </div>
        </PageSection>
      </ApplicationsPage>
      <EnvironmentModal
        environment={activeEnvironment}
        isModalOpen={isCreateEnvironmentModalOpen}
        onClose={handleCreateEnvironmentModalClose}
      />
    </>
  );
};
DataProjectDetails.displayName = 'DataProjectDetails';

export default DataProjectDetails;

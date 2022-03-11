import * as React from 'react';
import {
  PageSection,
  Title,
  Button,
  Flex,
  FlexItem,
  Breadcrumb,
  BreadcrumbItem,
  Tabs,
  Tab,
  TabTitleIcon,
  TabTitleText,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { projects } from './mockData';

import { useParams, Redirect } from 'react-router-dom';
import EnvironmentModal from './modals/EnvironmentModal';
import EnvironmentCard from './components/EnvironmentCard';
import './DataProjects.scss';
import { CogIcon, CubeIcon, CubesIcon, UsersIcon } from '@patternfly/react-icons';
import DataModal from './modals/DataModal';

const description = `View and edit data project and environment details.`;

const Empty = ({ type }) => (
  <EmptyState>
    <EmptyStateIcon icon={CubesIcon} />
    <Title headingLevel="h4" size="lg">
      No {type} here
    </Title>
    <EmptyStateBody>
      This represents an the empty state pattern in Patternfly 4. Hopefully it&apos;s simple enough
      to use but flexible enough to meet a variety of needs.
    </EmptyStateBody>
  </EmptyState>
);

export const DataProjectDetails: React.FC = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const isLoaded = true;
  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const [isCreateEnvironmentModalOpen, setCreateEnvironmentModalOpen] = React.useState(false);
  const [isAddDataModalOpen, setAddDataModalOpen] = React.useState(false);
  const [activeEnvironment, setActiveEnvironment] = React.useState(null);
  const [activeData, setActiveData] = React.useState(null);

  const project = projects.find((project) => project.metadata.name === projectName);

  if (!project) {
    return <Redirect to="/data-projects" />;
  }

  const handleCreateEnvironmentModalClose = () => {
    setCreateEnvironmentModalOpen(false);
  };

  const handleAddDataModalClose = () => {
    setAddDataModalOpen(false);
  };

  const handleTabClick = (event, tabIndex) => {
    setActiveTabKey(tabIndex);
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
          <Tabs
            activeKey={activeTabKey}
            onSelect={handleTabClick}
            className="odh-data-projects__details-tabs"
          >
            <Tab
              eventKey={0}
              title={
                <>
                  <TabTitleIcon>
                    <CubeIcon />
                  </TabTitleIcon>
                  <TabTitleText>Items</TabTitleText>
                </>
              }
            >
              <div className="odh-data-projects__details">
                <Flex>
                  <FlexItem>
                    <Title headingLevel="h3" size="lg">
                      Workspace environments
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
                      Create workspace environment
                    </Button>
                  </FlexItem>
                </Flex>
                {project.spec.environments && project.spec.environments.length !== 0 ? (
                  project.spec.environments.map((environment) => (
                    <EnvironmentCard
                      key={environment.name}
                      environment={environment}
                      setModalOpen={setCreateEnvironmentModalOpen}
                      setActiveEnvironment={setActiveEnvironment}
                    />
                  ))
                ) : (
                  <Empty type="workspace environment" />
                )}
              </div>
              <div className="odh-data-projects__details">
                <Flex>
                  <FlexItem>
                    <Title headingLevel="h3" size="lg">
                      Data
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActiveData(null);
                        setAddDataModalOpen(true);
                      }}
                    >
                      Add data
                    </Button>
                  </FlexItem>
                </Flex>
                {project.spec.data && project.spec.data.length !== 0 ? null : <Empty type="data" />}
              </div>
            </Tab>
            <Tab
              eventKey={1}
              title={
                <>
                  <TabTitleIcon>
                    <UsersIcon />
                  </TabTitleIcon>
                  <TabTitleText>Sharing</TabTitleText>
                </>
              }
            >
              Sharing
            </Tab>
            <Tab
              eventKey={2}
              title={
                <>
                  <TabTitleIcon>
                    <CogIcon />
                  </TabTitleIcon>
                  <TabTitleText>Settings</TabTitleText>
                </>
              }
            >
              Settings
            </Tab>
          </Tabs>
        </PageSection>
      </ApplicationsPage>
      <EnvironmentModal
        environment={activeEnvironment}
        isModalOpen={isCreateEnvironmentModalOpen}
        onClose={handleCreateEnvironmentModalClose}
      />
      <DataModal
        data={activeData}
        isModalOpen={isAddDataModalOpen}
        onClose={handleAddDataModalClose}
      />
    </>
  );
};
DataProjectDetails.displayName = 'DataProjectDetails';

export default DataProjectDetails;

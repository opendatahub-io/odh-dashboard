import * as React from 'react';
import { useHistory } from 'react-router-dom';
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
  Grid,
  GridItem,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';

import { CogIcon, CubeIcon, CubesIcon, UsersIcon } from '@patternfly/react-icons';
import { useParams, Redirect } from 'react-router-dom';
import EnvironmentModal from './modals/EnvironmentModal';
import EnvironmentCard from './components/EnvironmentCard';
import DataModal from './modals/DataModal';
import DataCard from './components/DataCard';
import './DataProjects.scss';
import { Project, NotebookList } from '../../types';
import {
  deleteDataProjectNotebook,
  getDataProject,
  getDataProjectNotebooks,
} from '../../services/dataProjectsService';

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
  const history = useHistory();

  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const [isCreateEnvironmentModalOpen, setCreateEnvironmentModalOpen] = React.useState(false);
  const [isAddDataModalOpen, setAddDataModalOpen] = React.useState(false);
  const [activeEnvironment, setActiveEnvironment] = React.useState(null);
  const [activeData, setActiveData] = React.useState(null);

  const [project, setProject] = React.useState<Project | undefined>(undefined);
  const [projectLoading, setProjectLoading] = React.useState(false);
  const [projectError, setProjectError] = React.useState(undefined);

  const [notebookList, setNotebookList] = React.useState<NotebookList | undefined>(undefined);
  const [notebooksLoading, setNotebooksLoading] = React.useState(false);
  const [notebooksError, setNotebooksError] = React.useState(undefined);

  const projectDisplayName =
    project?.metadata?.annotations?.['openshift.io/display-name'] ||
    project?.metadata?.name ||
    projectName;

  const loadProjects = () => {
    setProjectLoading(true);
    getDataProject(projectName)
      .then((prj: Project) => {
        setProject(prj);
        setProjectLoading(false);
      })
      .catch((e) => {
        setProjectError(e);
      });
  };

  const loadNotebooks = () => {
    setNotebooksLoading(true);
    getDataProjectNotebooks(projectName)
      .then((nbks: NotebookList) => {
        setNotebookList(nbks);
        setNotebooksLoading(false);
      })
      .catch((e) => {
        setNotebooksError(e);
      });
  };

  React.useEffect(() => {
    loadProjects();
    loadNotebooks();
  }, []);

  const handleCreateEnvironmentModalClose = () => {
    setCreateEnvironmentModalOpen(false);
    loadNotebooks();
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
        <BreadcrumbItem component="button" onClick={() => history.push('/data-projects')}>
          Data Projects
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{projectDisplayName}</BreadcrumbItem>
      </Breadcrumb>
      <ApplicationsPage
        title={projectDisplayName + ' Details'}
        description={description}
        loaded={!projectLoading}
        loadError={projectError}
        empty={!project}
        emptyMessage={'404: Project Not Found'}
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
                {notebookList?.items && notebookList?.items.length !== 0 ? (
                  <Grid sm={12} md={12} lg={12} xl={6} xl2={6} hasGutter>
                    {notebookList?.items.map((notebook, index) => (
                      <GridItem key={`environment-card-${index}`}>
                        <EnvironmentCard
                          environment={notebook}
                          setModalOpen={setCreateEnvironmentModalOpen}
                          setActiveEnvironment={setActiveEnvironment}
                          onDelete={(environment) =>
                            deleteDataProjectNotebook(projectName, environment.metadata.name)
                              .then(() => loadNotebooks())
                              .catch()
                          }
                        />
                      </GridItem>
                    ))}
                  </Grid>
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
                <Empty type="data" />
                {/*{project.spec.data && project.spec.data.length !== 0 ? (*/}
                {/*  <Grid sm={12} md={12} lg={12} xl={6} xl2={6} hasGutter>*/}
                {/*    {project.spec.data.map((d, index) => (*/}
                {/*      <GridItem key={`data-card-${index}`}>*/}
                {/*        <DataCard*/}
                {/*          data={d}*/}
                {/*          setModalOpen={setAddDataModalOpen}*/}
                {/*          setActiveData={setActiveData}*/}
                {/*        />*/}
                {/*      </GridItem>*/}
                {/*    ))}*/}
                {/*  </Grid>*/}
                {/*) : (*/}
                {/*  <Empty type="data" />*/}
                {/*)}*/}
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
        project={project}
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

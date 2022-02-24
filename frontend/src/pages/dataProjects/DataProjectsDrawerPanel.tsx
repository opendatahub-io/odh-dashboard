import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import './DataProjects.scss';
import EnvironmentContent from './EnvironmentContent';

type DataProjectsDrawerPanelProps = {
  selectedProject: any;
  onClose: () => void;
};

const DataProjectsDrawerPanel: React.FC<DataProjectsDrawerPanelProps> = ({
  selectedProject,
  onClose,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState(0);

  React.useEffect(() => {
    setActiveTabKey(0);
  }, [selectedProject]);

  if (!selectedProject) {
    return null;
  }

  const handleTabClick = (event, tabIndex) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <DrawerPanelContent>
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          {selectedProject.metadata.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Tabs isFilled activeKey={activeTabKey} onSelect={handleTabClick} isBox>
          <Tab eventKey={0} title={<TabTitleText>Environment</TabTitleText>}>
            <EnvironmentContent selectedProject={selectedProject} />
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Data</TabTitleText>}>
            Data
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Sharing</TabTitleText>}>
            Sharing
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>Settings</TabTitleText>}>
            Settings
          </Tab>
        </Tabs>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default DataProjectsDrawerPanel;

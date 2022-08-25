import * as React from 'react';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import NotebookAdmin from './NotebookAdmin';
import { NotebookControllerTabTypes } from '../../const';
import NotebookServerRoutes from '../server/NotebookServerRoutes';
import { NotebookControllerContext } from '../../NotebookControllerContext';

const NotebookControllerTabs: React.FC = () => {
  const { setImpersonating, currentTab, setCurrentAdminTab } =
    React.useContext(NotebookControllerContext);

  return (
    <div>
      <Tabs
        activeKey={currentTab}
        unmountOnExit
        onSelect={(e, eventKey) => {
          setImpersonating();
          setCurrentAdminTab(eventKey as NotebookControllerTabTypes);
        }}
      >
        <Tab
          eventKey={NotebookControllerTabTypes.SERVER}
          title={<TabTitleText>Notebook Server</TabTitleText>}
        >
          <NotebookServerRoutes />
        </Tab>
        <Tab
          eventKey={NotebookControllerTabTypes.ADMIN}
          title={<TabTitleText>Administration</TabTitleText>}
        >
          <NotebookAdmin />
        </Tab>
      </Tabs>
    </div>
  );
};

export default NotebookControllerTabs;

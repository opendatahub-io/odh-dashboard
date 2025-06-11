import * as React from 'react';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { NotebookControllerTabTypes } from '#~/pages/notebookController/const';
import NotebookServerRoutes from '#~/pages/notebookController/screens/server/NotebookServerRoutes';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { asEnumMember } from '#~/utilities/utils';
import NotebookAdmin from './NotebookAdmin';

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
          const enumValue = asEnumMember(eventKey, NotebookControllerTabTypes);
          if (enumValue !== null) {
            setCurrentAdminTab(enumValue);
          }
        }}
      >
        <Tab
          data-id="spawner-tab"
          data-testid="spawner-tab"
          eventKey={NotebookControllerTabTypes.SERVER}
          title={<TabTitleText>Workbench</TabTitleText>}
        >
          <NotebookServerRoutes />
        </Tab>
        <Tab
          data-id="admin-tab"
          data-testid="admin-tab"
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

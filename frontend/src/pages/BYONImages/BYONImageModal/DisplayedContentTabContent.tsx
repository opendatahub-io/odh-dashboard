import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  TabContent,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { BYONImagePackage } from '#~/types';
import { DisplayedContentTab } from './ManageBYONImageModal';
import DisplayedContentTable from './DisplayedContentTable';

type DisplayedContentTabContentProps = {
  activeKey: string | number;
  tabKey: DisplayedContentTab;
  resources: BYONImagePackage[];
  setResources: React.Dispatch<React.SetStateAction<BYONImagePackage[]>>;
};

const DisplayedContentTabContent: React.FC<DisplayedContentTabContentProps> = ({
  activeKey,
  tabKey,
  resources,
  setResources,
}) => {
  const resourceType = tabKey === DisplayedContentTab.SOFTWARE ? 'software' : 'packages';

  return (
    <TabContent
      id={`tabContent-${tabKey}`}
      eventKey={tabKey}
      activeKey={activeKey}
      hidden={tabKey !== activeKey}
    >
      {resources.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={PlusCircleIcon}
          titleText={`No ${resourceType} displayed`}
          variant={EmptyStateVariant.sm}
        >
          <EmptyStateBody>
            Displayed contents help to inform other users about what your workbench image contains.
            To add displayed content, add the names of software or packages included in your image
            that you want users to know about.
          </EmptyStateBody>
          <EmptyStateFooter>
            <Button
              data-testid={`add-${resourceType}-button`}
              variant="secondary"
              onClick={() => {
                setResources([...resources, { name: '', version: '', visible: true }]);
              }}
            >
              Add {resourceType}
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <DisplayedContentTable tabKey={tabKey} resources={resources} setResources={setResources} />
      )}
    </TabContent>
  );
};

export default DisplayedContentTabContent;

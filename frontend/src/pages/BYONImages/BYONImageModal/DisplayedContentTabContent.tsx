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
import { BYONImagePackage } from '~/types';
import { DisplayedContentTab } from './ManageBYONImageModal';
import DisplayedContentTable from './DisplayedContentTable';

type DisplayedContentTabContentProps = {
  activeKey: string | number;
  tabKey: DisplayedContentTab;
  resources: BYONImagePackage[];
  setResources: React.Dispatch<React.SetStateAction<BYONImagePackage[]>>;
  tempResources: BYONImagePackage[];
  setTempResources: React.Dispatch<React.SetStateAction<BYONImagePackage[]>>;
  editIndex?: number;
  setEditIndex: (index?: number) => void;
};

const DisplayedContentTabContent: React.FC<DisplayedContentTabContentProps> = ({
  activeKey,
  tabKey,
  resources,
  setResources,
  tempResources,
  setTempResources,
  editIndex,
  setEditIndex,
}) => {
  const resourceType = tabKey === DisplayedContentTab.SOFTWARE ? 'software' : 'packages';

  const addEmptyRow = React.useCallback(() => {
    setTempResources((prev) => [
      ...prev,
      {
        name: '',
        version: '',
        visible: true,
      },
    ]);
    setEditIndex(tempResources.length);
  }, [tempResources.length, setTempResources, setEditIndex]);

  return (
    <TabContent
      id={`tabContent-${tabKey}`}
      eventKey={tabKey}
      activeKey={activeKey}
      hidden={tabKey !== activeKey}
    >
      {tempResources.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={PlusCircleIcon}
          titleText={`No ${resourceType} displayed`}
          variant={EmptyStateVariant.sm}
        >
          <EmptyStateBody>
            Displayed contents help inform other users of what your notebook image contains. To add
            displayed content, add the names of software or packages included in your image that you
            want users to know about.
          </EmptyStateBody>
          <EmptyStateFooter>
            <Button
              data-testid={`add-${resourceType}-button`}
              variant="secondary"
              onClick={addEmptyRow}
            >
              Add {resourceType}
            </Button>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <DisplayedContentTable
          tabKey={tabKey}
          onReset={() => {
            setTempResources([...resources]);
            setEditIndex(undefined);
          }}
          onConfirm={(rowIndex, name, version) => {
            const copiedArray = [...tempResources];
            copiedArray[rowIndex].name = name;
            copiedArray[rowIndex].version = version;
            setTempResources(copiedArray);
            setResources(copiedArray);
            setEditIndex(undefined);
          }}
          resources={tempResources}
          onAdd={addEmptyRow}
          editIndex={editIndex}
          onEdit={setEditIndex}
          onDelete={(index) => {
            const copiedArray = [...resources];
            copiedArray.splice(index, 1);
            setTempResources(copiedArray);
            setResources(copiedArray);
          }}
        />
      )}
    </TabContent>
  );
};

export default DisplayedContentTabContent;

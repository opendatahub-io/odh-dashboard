import * as React from 'react';
import { DrawerPanelBody, Tab, TabContent, Tabs } from '@patternfly/react-core';

enum PipelineRunNodeTabs {
  INPUT_OUTPUT = 'Input / Output',
  VISUALIZATIONS = 'Visualizations',
  DETAILS = 'Details',
  VOLUMES = 'Volumes',
  LOGS = 'Logs',
  POD = 'Pod',
  EVENTS = 'Events',
  ML_METADATA = 'ML Metadata',
}

type PipelineRunDrawerRightTabsProps = {};

const PipelineRunDrawerRightTabs: React.FC<PipelineRunDrawerRightTabsProps> = () => {
  const [selection, setSelection] = React.useState(PipelineRunNodeTabs.DETAILS);

  const tabContentProps = (tab: PipelineRunNodeTabs): React.ComponentProps<typeof TabContent> => ({
    id: tab,
    eventKey: tab,
    activeKey: selection ?? '',
    hidden: tab !== selection,
  });

  return (
    <>
      <Tabs activeKey={selection ?? undefined}>
        {Object.values(PipelineRunNodeTabs).map((tab) => (
          <Tab
            key={tab}
            title={tab}
            eventKey={tab}
            tabContentId={tab}
            onClick={() => setSelection(tab)}
          />
        ))}
      </Tabs>
      {selection && (
        <DrawerPanelBody>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.INPUT_OUTPUT)}>TBD</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.VISUALIZATIONS)}>TBD 2</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.DETAILS)}>TBD 3</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.VOLUMES)}>TBD 4</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.LOGS)}>TBD 5</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.POD)}>TBD 6</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.EVENTS)}>TBD 7</TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.ML_METADATA)}>TBD 8</TabContent>
        </DrawerPanelBody>
      )}
    </>
  );
};

export default PipelineRunDrawerRightTabs;

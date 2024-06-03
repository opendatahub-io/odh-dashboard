import * as React from 'react';
import { DrawerPanelContent } from '@patternfly/react-core';
import PipelineRunDrawerBottomTabs, {
  RunDetailsTabSelection,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomTabs';

type PipelineRunBottomDrawerContentProps = {
  detailsTab: RunDetailsTabSelection;
  onSelectionChange: (newSelection: RunDetailsTabSelection) => void;
} & Omit<React.ComponentProps<typeof PipelineRunDrawerBottomTabs>, 'selection' | 'onSelection'>;

const CLOSED_MIN_SIZE = '40px';
const OPEN_MIN_SIZE_THRESHOLD = 115;
const OPEN_MIN_SIZE = `${OPEN_MIN_SIZE_THRESHOLD - 15}px`;

const PipelineRunDrawerBottomContent: React.FC<PipelineRunBottomDrawerContentProps> = ({
  detailsTab,
  onSelectionChange,
  ...drawerProps
}) => (
  <DrawerPanelContent
    isResizable={!!detailsTab}
    defaultSize={detailsTab ? '300px' : CLOSED_MIN_SIZE}
    minSize={detailsTab ? OPEN_MIN_SIZE : CLOSED_MIN_SIZE}
    onResize={(e, size) => {
      if (size < OPEN_MIN_SIZE_THRESHOLD) {
        onSelectionChange(null);
      }
    }}
  >
    <PipelineRunDrawerBottomTabs
      {...drawerProps}
      selection={detailsTab}
      onSelection={(tabId) => onSelectionChange(tabId)}
    />
  </DrawerPanelContent>
);

export default PipelineRunDrawerBottomContent;

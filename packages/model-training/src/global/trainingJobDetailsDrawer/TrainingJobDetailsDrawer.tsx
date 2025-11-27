import * as React from 'react';
import {
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  MenuToggle,
  Dropdown,
  DropdownList,
  DropdownItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import TrainingJobResourcesTab from './TrainingJobResourcesTab';
import TrainingJobPodsTab from './TrainingJobPodsTab';
import TrainingJobLogsTab from './TrainingJobLogsTab';
import ScaleNodesModal from '../trainingJobList/ScaleNodesModal';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { useTrainingJobNodeScaling } from '../../hooks/useTrainingJobNodeScaling';

type TrainingJobDetailsDrawerProps = {
  job: TrainJobKind | undefined;
  displayName: string;
  jobStatus?: TrainingJobState;
  onClose: () => void;
  onDelete: (job: TrainJobKind) => void;
};

const TrainingJobDetailsDrawer: React.FC<TrainingJobDetailsDrawerProps> = ({
  job,
  displayName,
  jobStatus,
  onClose,
  onDelete,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [selectedPodForLogs, setSelectedPodForLogs] = React.useState<PodKind | null>(null);
  const [selectedPodNameFromClick, setSelectedPodNameFromClick] = React.useState<
    string | undefined
  >(undefined);

  const {
    nodesCount,
    canScaleNodes,
    isScaling,
    scaleNodesModalOpen,
    openScaleNodesModal,
    closeScaleNodesModal,
    handleScaleNodes,
  } = useTrainingJobNodeScaling(job, jobStatus);

  if (!job) {
    return null;
  }

  const handlePodClick = (podName: string) => {
    setSelectedPodNameFromClick(podName);
    setActiveTabKey(2);
  };

  const handlePodChange = (pod: PodKind | null) => {
    setSelectedPodForLogs(pod);
    if (selectedPodNameFromClick) {
      setSelectedPodNameFromClick(undefined);
    }
  };

  const description = `Description goes here. TrainJob in ${job.metadata.namespace}.`;

  return (
    <DrawerPanelContent
      isResizable
      defaultSize="40%"
      minSize="25%"
      data-testid="training-job-details-drawer"
    >
      <DrawerHead>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Title headingLevel="h2" size="xl">
              {displayName}
            </Title>
          </FlexItem>

          <FlexItem>
            <DrawerActions>
              <Dropdown
                isOpen={isKebabOpen}
                onSelect={() => setIsKebabOpen(false)}
                onOpenChange={(isOpen: boolean) => setIsKebabOpen(isOpen)}
                popperProps={{ position: 'right' }}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    aria-label="Kebab toggle"
                    variant="plain"
                    onClick={() => setIsKebabOpen(!isKebabOpen)}
                    isExpanded={isKebabOpen}
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <DropdownList>
                  <DropdownItem key="delete" onClick={() => onDelete(job)}>
                    Delete
                  </DropdownItem>
                  {canScaleNodes && (
                    <DropdownItem key="scale-nodes" onClick={openScaleNodesModal}>
                      Edit node count
                    </DropdownItem>
                  )}
                </DropdownList>
              </Dropdown>
              <DrawerCloseButton onClick={onClose} />
            </DrawerActions>
          </FlexItem>
        </Flex>
        <div style={{ marginTop: '8px' }}>
          <p>{description}</p>
        </div>
      </DrawerHead>
      <DrawerPanelBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
          aria-label="Training job details tabs"
          role="region"
        >
          {/* TODO: RHOAIENG-38270	 Uncomment this when training details are implemented */}
          {/* <Tab
            eventKey={0}
            title={<TabTitleText>Training details</TabTitleText>}
            aria-label="Training details"
          >
            <div style={{ padding: '16px 0' }}>Training details content</div>
          </Tab> */}
          <Tab eventKey={0} title={<TabTitleText>Resources</TabTitleText>} aria-label="Resources">
            <TrainingJobResourcesTab job={job} />
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Pods</TabTitleText>} aria-label="Pods">
            <TrainingJobPodsTab job={job} onPodClick={handlePodClick} />
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Logs</TabTitleText>} aria-label="Logs">
            <TrainingJobLogsTab
              job={job}
              selectedPod={selectedPodForLogs}
              selectedPodNameFromClick={selectedPodNameFromClick}
              onPodChange={handlePodChange}
            />
          </Tab>
        </Tabs>
      </DrawerPanelBody>

      <ScaleNodesModal
        job={scaleNodesModalOpen ? job : undefined}
        currentNodeCount={nodesCount}
        isScaling={isScaling}
        onClose={closeScaleNodesModal}
        onConfirm={handleScaleNodes}
      />
    </DrawerPanelContent>
  );
};

export default TrainingJobDetailsDrawer;

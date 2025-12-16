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
  Divider,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import TrainingJobResourcesTab from './TrainingJobResourcesTab';
import TrainingJobPodsTab from './TrainingJobPodsTab';
import TrainingJobLogsTab from './TrainingJobLogsTab';
import TrainingJobDetailsTab from './TrainingJobDetailsTab';
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
    setScaleNodesModalOpen,
    handleScaleNodes,
  } = useTrainingJobNodeScaling(job, jobStatus);

  // Reset pod selection when job changes (e.g., new TrainJob re-created)
  React.useEffect(() => {
    setSelectedPodForLogs(null);
    setSelectedPodNameFromClick(undefined);
  }, [job?.metadata.uid]);

  if (!job) {
    return null;
  }

  const handlePodClick = (podName: string) => {
    setSelectedPodNameFromClick(podName);
    setActiveTabKey(3); // Switch to Logs tab
  };

  const handlePodChange = (pod: PodKind | null) => {
    setSelectedPodForLogs(pod);
    if (selectedPodNameFromClick) {
      setSelectedPodNameFromClick(undefined);
    }
  };

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
                  {canScaleNodes && (
                    <DropdownItem key="scale-nodes" onClick={() => setScaleNodesModalOpen(true)}>
                      Edit node count
                    </DropdownItem>
                  )}
                  {/* TODO: RHOAIENG-37577 Pause/Resume action is currently blocked by backend */}
                  {canScaleNodes && <Divider component="li" key="separator" />}
                  <DropdownItem key="delete" onClick={() => onDelete(job)}>
                    Delete job
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
              <DrawerCloseButton onClick={onClose} />
            </DrawerActions>
          </FlexItem>
        </Flex>
      </DrawerHead>
      <DrawerPanelBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
          aria-label="Training job details tabs"
          role="region"
        >
          <Tab
            eventKey={0}
            title={<TabTitleText>Training details</TabTitleText>}
            aria-label="Training details"
          >
            <TrainingJobDetailsTab job={job} />
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Resources</TabTitleText>} aria-label="Resources">
            <TrainingJobResourcesTab
              job={job}
              nodesCount={nodesCount}
              canScaleNodes={canScaleNodes}
              onScaleNodes={() => setScaleNodesModalOpen(true)}
            />
          </Tab>

          <Tab eventKey={2} title={<TabTitleText>Pods</TabTitleText>} aria-label="Pods">
            <TrainingJobPodsTab job={job} onPodClick={handlePodClick} />
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>Logs</TabTitleText>} aria-label="Logs">
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
        onClose={() => setScaleNodesModalOpen(false)}
        onConfirm={handleScaleNodes}
      />
    </DrawerPanelContent>
  );
};

export default TrainingJobDetailsDrawer;

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
  Spinner,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import TrainingJobResourcesTab from './TrainingJobResourcesTab';
import TrainingJobPodsTab from './TrainingJobPodsTab';
import TrainingJobLogsTab from './TrainingJobLogsTab';
import TrainingJobDetailsTab from './TrainingJobDetailsTab';
import ScaleNodesModal from '../trainingJobList/ScaleNodesModal';
import PauseTrainingJobModal from '../trainingJobList/PauseTrainingJobModal';
import { useTrainingJobPauseResume } from '../trainingJobList/hooks/useTrainingJobPauseResume';
import { getStatusFlags } from '../trainingJobList/utils';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { useTrainingJobNodeScaling } from '../../hooks/useTrainingJobNodeScaling';

type TrainingJobDetailsDrawerProps = {
  job: TrainJobKind | undefined;
  displayName: string;
  jobStatus?: TrainingJobState;
  onClose: () => void;
  onDelete: (job: TrainJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  onTogglingChange?: (jobId: string | undefined) => void;
};

const TrainingJobDetailsDrawer: React.FC<TrainingJobDetailsDrawerProps> = ({
  job,
  displayName,
  jobStatus,
  onClose,
  onDelete,
  onStatusUpdate,
  onTogglingChange,
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

  const {
    isToggling,
    pauseModalOpen,
    closePauseModal,
    onPauseClick,
    handlePause,
    handleResume,
    dontShowModalValue,
    setDontShowModalValue,
  } = useTrainingJobPauseResume(job, onStatusUpdate);

  const { isPaused, canPauseResume } = getStatusFlags(jobStatus || TrainingJobState.UNKNOWN);

  // Track previous isToggling value to close dropdown when action completes
  // and notify parent of toggling state changes
  const wasTogglingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasTogglingRef.current && !isToggling) {
      setIsKebabOpen(false);
    }
    wasTogglingRef.current = isToggling;

    // Notify parent of toggling state change
    const jobId = job?.metadata.uid || job?.metadata.name;
    onTogglingChange?.(isToggling ? jobId : undefined);
  }, [isToggling, job?.metadata.uid, job?.metadata.name, onTogglingChange]);

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
                    <DropdownItem
                      key="scale-nodes"
                      onClick={() => {
                        setIsKebabOpen(false);
                        setScaleNodesModalOpen(true);
                      }}
                    >
                      Edit node count
                    </DropdownItem>
                  )}
                  {canPauseResume && (
                    <DropdownItem
                      key="pause-resume"
                      onClick={isPaused ? handleResume : onPauseClick}
                      isDisabled={isToggling}
                      icon={isToggling ? <Spinner size="sm" /> : undefined}
                    >
                      {isPaused ? 'Resume job' : 'Pause job'}
                    </DropdownItem>
                  )}
                  {(canScaleNodes || canPauseResume) && <Divider component="li" key="separator" />}
                  <DropdownItem
                    key="delete"
                    onClick={() => {
                      setIsKebabOpen(false);
                      onDelete(job);
                    }}
                  >
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
            title={<TabTitleText>Training job details</TabTitleText>}
            aria-label="Training job details"
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

      {scaleNodesModalOpen && (
        <ScaleNodesModal
          job={job}
          currentNodeCount={nodesCount}
          isScaling={isScaling}
          onClose={() => setScaleNodesModalOpen(false)}
          onConfirm={handleScaleNodes}
        />
      )}

      {pauseModalOpen && (
        <PauseTrainingJobModal
          job={job}
          isPausing={isToggling}
          onClose={closePauseModal}
          onConfirm={handlePause}
          dontShowModalValue={dontShowModalValue}
          setDontShowModalValue={setDontShowModalValue}
        />
      )}
    </DrawerPanelContent>
  );
};

export default TrainingJobDetailsDrawer;

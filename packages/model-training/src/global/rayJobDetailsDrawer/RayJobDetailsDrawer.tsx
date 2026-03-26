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
import RayJobDetailsTab from './RayJobDetailsTab';
import RayJobResourcesTab from './RayJobResourcesTab';
import RayJobLogsTab from './RayJobLogsTab';
import RayJobPodsTab from './RayJobPodsTab';
import PauseRayJobModal from '../trainingJobList/PauseRayJobModal';
import { useRayJobPauseResume } from '../trainingJobList/hooks/useRayJobPauseResume';
import { getStatusFlags, getRayJobStatusSync } from '../trainingJobList/utils';
import { RayJobKind } from '../../k8sTypes';
import { JobDisplayState, RayJobState, TrainingJobState } from '../../types';

type RayJobDetailsDrawerProps = {
  job: RayJobKind | undefined;
  displayName: string;
  nodeCount: number;
  jobStatus?: JobDisplayState;
  onClose: () => void;
  onDelete: (job: RayJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: RayJobState) => void;
  onTogglingChange?: (isToggling: boolean) => void;
};

const RayJobDetailsDrawer: React.FC<RayJobDetailsDrawerProps> = ({
  job,
  displayName,
  nodeCount,
  jobStatus,
  onClose,
  onDelete,
  onStatusUpdate,
  onTogglingChange,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);

  const status = job ? jobStatus || getRayJobStatusSync(job) : TrainingJobState.UNKNOWN;
  const { isPaused, canPauseResume } = getStatusFlags(status);

  const {
    isSubmitting,
    pauseModalOpen,
    closePauseModal,
    onPauseClick,
    handlePause,
    handleResume,
    dontShowModalValue,
    setDontShowModalValue,
  } = useRayJobPauseResume(job, onStatusUpdate);

  React.useEffect(() => {
    onTogglingChange?.(isSubmitting);
    return () => {
      onTogglingChange?.(false);
    };
  }, [isSubmitting, onTogglingChange]);

  if (!job) {
    return null;
  }

  return (
    <>
      <DrawerPanelContent
        isResizable
        defaultSize="40%"
        minSize="25%"
        data-testid="ray-job-details-drawer"
      >
        <DrawerHead>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <Title headingLevel="h2" size="xl" data-testid="ray-job-drawer-title">
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
                    {canPauseResume && (
                      <DropdownItem
                        key="pause-resume"
                        isDisabled={isSubmitting}
                        onClick={() => {
                          setIsKebabOpen(false);
                          if (isPaused) {
                            void handleResume();
                          } else {
                            onPauseClick();
                          }
                        }}
                      >
                        {isPaused ? 'Resume job' : 'Pause job'}
                      </DropdownItem>
                    )}
                    <DropdownItem
                      key="delete"
                      isDisabled={isSubmitting}
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
            aria-label="RayJob details tabs"
            role="region"
          >
            <Tab eventKey={0} title={<TabTitleText>Details</TabTitleText>} aria-label="Details">
              <RayJobDetailsTab job={job} />
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Resources</TabTitleText>} aria-label="Resources">
              <RayJobResourcesTab job={job} nodeCount={nodeCount} />
            </Tab>
            <Tab eventKey={2} title={<TabTitleText>Pods</TabTitleText>} aria-label="Pods">
              <RayJobPodsTab job={job} />
            </Tab>
            <Tab eventKey={3} title={<TabTitleText>Logs</TabTitleText>} aria-label="Logs">
              <RayJobLogsTab job={job} />
            </Tab>
          </Tabs>
        </DrawerPanelBody>
      </DrawerPanelContent>

      {pauseModalOpen && (
        <PauseRayJobModal
          job={job}
          isPausing={isSubmitting}
          onClose={closePauseModal}
          onConfirm={handlePause}
          dontShowModalValue={dontShowModalValue}
          setDontShowModalValue={setDontShowModalValue}
        />
      )}
    </>
  );
};

export default RayJobDetailsDrawer;

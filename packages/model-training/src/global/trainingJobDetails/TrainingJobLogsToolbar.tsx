import React from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Truncate,
  Icon,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Tooltip,
  Divider,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { LogViewerSearch } from '@patternfly/react-log-viewer';
import {
  CompressIcon,
  EllipsisVIcon,
  ExpandIcon,
  OutlinedPauseCircleIcon,
  OutlinedPlayCircleIcon,
  OutlinedWindowRestoreIcon,
} from '@patternfly/react-icons';
import DownloadDropdown from '@odh-dashboard/internal/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/DownloadDropdown';
import { PodContainer } from '@odh-dashboard/internal/types';

interface TrainingJobLogsToolbarProps {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  podContainers: PodContainer[];
  selectedContainer: PodContainer | null;
  defaultContainerName?: string;
  setSelectedContainer: (container: PodContainer | null) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  showSearchbar: boolean;
  setShowSearchbar: (show: boolean) => void;
  isKebabOpen: boolean;
  setIsKebabOpen: (open: boolean) => void;
  isTextWrapped: boolean;
  setIsTextWrapped: (wrapped: boolean) => void;
  isFullScreen: boolean;
  onExpandClick: () => void;
  downloading: boolean;
  onDownload: () => void;
  onDownloadAll: () => void;
  rawLogsLink: string;
  hasLogs: boolean;
}

const TrainingJobLogsToolbar: React.FC<TrainingJobLogsToolbarProps> = ({
  isPaused,
  setIsPaused,
  podContainers,
  selectedContainer,
  defaultContainerName,
  setSelectedContainer,
  open,
  setOpen,
  showSearchbar,
  setShowSearchbar,
  isKebabOpen,
  setIsKebabOpen,
  isTextWrapped,
  setIsTextWrapped,
  isFullScreen,
  onExpandClick,
  downloading,
  onDownload,
  onDownloadAll,
  rawLogsLink,
  hasLogs,
}) => (
  <Toolbar>
    <ToolbarContent>
      <ToolbarGroup>
        <ToolbarItem>
          <Button
            data-testid="logs-pause-refresh-button"
            aria-label={isPaused ? 'Resume logs' : 'Pause logs'}
            variant="plain"
            onClick={() => setIsPaused(!isPaused)}
          >
            <Icon size="xl">
              {isPaused ? <OutlinedPlayCircleIcon /> : <OutlinedPauseCircleIcon />}
            </Icon>
          </Button>
        </ToolbarItem>
        {podContainers.length > 1 && (
          <ToolbarItem>
            <Dropdown
              isOpen={open}
              onSelect={() => setOpen(false)}
              onOpenChange={(isOpen: boolean) => setOpen(isOpen)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setOpen(!open)}
                  isExpanded={open}
                  style={{
                    minWidth: '200px',
                  }}
                >
                  <Truncate content={selectedContainer?.name ?? 'Select container'} />
                </MenuToggle>
              )}
              ouiaId="ContainerDropdown"
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownGroup>
                  {podContainers.map((container) => (
                    <DropdownItem
                      data-testid={`logs-container-dropdown-item-${container.name}`}
                      key={container.name}
                      onClick={() => setSelectedContainer(container)}
                    >
                      <Flex alignItems={{ default: 'alignItemsCenter' }}>
                        <FlexItem>
                          <Truncate content={container.name} />
                        </FlexItem>
                        {container.name === defaultContainerName && (
                          <FlexItem>
                            <Label>Default</Label>
                          </FlexItem>
                        )}
                      </Flex>
                    </DropdownItem>
                  ))}
                </DropdownGroup>
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
        )}
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarItem>
          <Button
            variant="plain"
            aria-label="Search"
            onClick={() => setShowSearchbar(!showSearchbar)}
          >
            <LogViewerSearch
              placeholder="Search"
              minSearchChars={1}
              onFocus={() => setShowSearchbar(true)}
            />
          </Button>
        </ToolbarItem>
        <ToolbarItem>
          <Dropdown
            isOpen={isKebabOpen}
            onSelect={() => setIsKebabOpen(false)}
            onOpenChange={(isOpen: boolean) => setIsKebabOpen(isOpen)}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                aria-label="LogViewer kebab toggle"
                variant="plain"
                onClick={() => setIsKebabOpen(!isKebabOpen)}
                isExpanded={isKebabOpen}
              >
                <EllipsisVIcon />
              </MenuToggle>
            )}
            ouiaId="KebabDropdown"
            shouldFocusToggleOnSelect
          >
            <DropdownList>
              <DropdownItem
                key="view-raw-logs"
                onClick={() => {
                  window.open(rawLogsLink, '_blank');
                }}
              >
                View raw logs
              </DropdownItem>
              <Divider component="li" />
              <DropdownItem
                key="expand"
                onClick={onExpandClick}
                icon={<Icon>{isFullScreen ? <CompressIcon /> : <ExpandIcon />}</Icon>}
              >
                {isFullScreen ? 'Collapse' : 'Expand'}
              </DropdownItem>
              <DropdownItem
                key="wrap"
                onClick={() => setIsTextWrapped(!isTextWrapped)}
                icon={
                  <Icon>
                    <OutlinedWindowRestoreIcon />
                  </Icon>
                }
              >
                <Checkbox
                  id="wrapTextCheckbox"
                  isChecked={isTextWrapped}
                  onChange={() => setIsTextWrapped(!isTextWrapped)}
                />
                <span style={{ marginLeft: '8px' }}>Wrap text</span>
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ToolbarItem>
      </ToolbarGroup>
      <ToolbarGroup align={{ default: 'alignEnd' }}>
        <ToolbarItem gap={{ default: 'gapNone' }}>
          {downloading && <Spinner size="sm" className="pf-v6-u-my-sm" />}
          {podContainers.length <= 1 ? (
            <Tooltip position="top" content={<div>Download current step log</div>}>
              <Button
                onClick={onDownload}
                variant="link"
                aria-label="Download current step log"
                icon={<DownloadIcon />}
                isDisabled={!selectedContainer || downloading || !hasLogs}
              />
            </Tooltip>
          ) : (
            <Tooltip content="Download">
              <DownloadDropdown
                onDownload={onDownload}
                onDownloadAll={onDownloadAll}
                isSingleStepLogsEmpty={!hasLogs}
              />
            </Tooltip>
          )}
        </ToolbarItem>
      </ToolbarGroup>
    </ToolbarContent>
  </Toolbar>
);

export default TrainingJobLogsToolbar;

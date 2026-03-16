import * as React from 'react';
import {
  Content,
  ContentVariants,
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
import { RayJobKind } from '../../k8sTypes';

type RayJobDetailsDrawerProps = {
  job: RayJobKind | undefined;
  displayName: string;
  onClose: () => void;
  onDelete: (job: RayJobKind) => void;
};

const RayJobDetailsDrawer: React.FC<RayJobDetailsDrawerProps> = ({
  job,
  displayName,
  onClose,
  onDelete,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);

  if (!job) {
    return null;
  }

  return (
    <DrawerPanelContent
      isResizable
      defaultSize="40%"
      minSize="25%"
      data-testid="ray-job-details-drawer"
    >
      <DrawerHead>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
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
          aria-label="RayJob details tabs"
          role="region"
        >
          <Tab eventKey={0} title={<TabTitleText>Details</TabTitleText>} aria-label="Details">
            <RayJobDetailsTab job={job} />
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Resources</TabTitleText>} aria-label="Resources">
            <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
              Resources content will be available in a future update.
            </Content>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Pods</TabTitleText>} aria-label="Pods">
            <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
              Pods content will be available in a future update.
            </Content>
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>Logs</TabTitleText>} aria-label="Logs">
            <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
              Logs content will be available in a future update.
            </Content>
          </Tab>
        </Tabs>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default RayJobDetailsDrawer;

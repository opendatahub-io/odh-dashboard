import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import '#~/pages/notebookController/NotebookController.scss';
import { useState } from 'react';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { MigrationAction } from './types';
import { MIGRATION_SOURCE_TYPE_LABELS } from './const';

type ResourceNameTooltipProps = {
  children: React.ReactElement;
  wrap?: boolean;
  migrationAction: MigrationAction;
  onMigrate: () => void;
};

const MigrationTooltip: React.FC<ResourceNameTooltipProps> = ({
  children,
  wrap = true,
  migrationAction,
  onMigrate,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div style={{ display: wrap ? 'block' : 'inline-flex' }}>
      <Flex
        flexWrap={{ default: 'nowrap' }}
        gap={{ default: 'gapSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>{children}</FlexItem>
        {migrationAction.source.resource.metadata?.name && (
          <Popover
            position="right"
            maxWidth="375px"
            isVisible={isVisible}
            shouldOpen={() => setIsVisible(true)}
            shouldClose={() => setIsVisible(false)}
            bodyContent={
              <Stack hasGutter>
                <StackItem>
                  This legacy hardware profile was created from a{' '}
                  {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]}.
                  <br />
                  <br />
                  Migrating this profile creates a matching resource in Kubernetes, and deletes its
                  source resource. Deployed workloads using this legacy profile will be unaffected
                  by the migration.
                </StackItem>
                <StackItem>
                  <DescriptionList isFluid isCompact isHorizontal>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Source resource name</DescriptionListTerm>
                      <DescriptionListDescription>
                        <ClipboardCopy
                          hoverTip="Copy"
                          clickTip="Copied"
                          variant="inline-compact"
                          data-testid="resource-name-text"
                        >
                          {migrationAction.source.resource.metadata.name}
                        </ClipboardCopy>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Source resource type</DescriptionListTerm>
                      <DescriptionListDescription data-testid="resource-kind-text">
                        {migrationAction.source.resource.kind}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </StackItem>
                <StackItem>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setIsVisible(false);
                      onMigrate();
                    }}
                  >
                    Migrate
                  </Button>
                </StackItem>
              </Stack>
            }
          >
            <DashboardPopupIconButton
              iconProps={{ status: 'info' }}
              icon={<InfoCircleIcon />}
              style={{ paddingTop: 0, paddingBottom: 0 }}
            />
          </Popover>
        )}
      </Flex>
    </div>
  );
};

export default MigrationTooltip;

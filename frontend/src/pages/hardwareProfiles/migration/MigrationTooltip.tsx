import * as React from 'react';
import {
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import '~/pages/notebookController/NotebookController.scss';
import { MigrationAction, MigrationSourceType } from './types';

type ResourceNameTooltipProps = {
  children: React.ReactElement;
  wrap?: boolean;
  migrationAction: MigrationAction;
};

export const MIGRATION_SOURCE_TYPE_LABELS = {
  [MigrationSourceType.ACCELERATOR_PROFILE]: 'accelerator profile',
  [MigrationSourceType.SERVING_CONTAINER_SIZE]: 'admin defined model serving container size',
  [MigrationSourceType.NOTEBOOK_CONTAINER_SIZE]: 'admin defined notebook container size',
};

const MigrationTooltip: React.FC<ResourceNameTooltipProps> = ({
  children,
  wrap = true,
  migrationAction,
}) => (
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
          bodyContent={
            <Stack hasGutter>
              <StackItem>
                This hardware profile has been translated from a{' '}
                {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]}.
                <br />
                <br />
                To make any changes to the translated resource, the source resource will be deleted
                and a new hardware profile will be created in its place.
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
            </Stack>
          }
        >
          <Label
            icon={<InfoCircleIcon />}
            onClick={(e) => {
              e.preventDefault();
            }}
            isCompact
            color="blue"
          >
            Simulated
          </Label>
        </Popover>
      )}
    </Flex>
  </div>
);

export default MigrationTooltip;

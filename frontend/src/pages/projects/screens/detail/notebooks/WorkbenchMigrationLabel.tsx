import * as React from 'react';
import { Label, Popover, Stack, StackItem } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

const WorkbenchMigrationLabel: React.FC = () => (
  <Popover
    aria-label="Migration required information"
    position="top"
    alertSeverityVariant="warning"
    headerIcon={<ExclamationTriangleIcon />}
    headerContent={
      <span data-testid="workbench-migration-required-popover-title">Migration required</span>
    }
    bodyContent={
      <Stack data-testid="workbench-migration-required-popover" hasGutter>
        <StackItem>
          To prevent access issues, migrate this workbench by editing the workbench description and
          saving.
        </StackItem>
        <StackItem>
          Alternatively, delete this workbench and create a new one using the same cluster storage
          to preserve user data.
        </StackItem>
        <StackItem>
          Note: Once migrated, the old URL will no longer work. Access the new URL by clicking on
          the name link.
        </StackItem>
      </Stack>
    }
  >
    <Label
      data-testid="workbench-migration-required-label"
      isCompact
      status="warning"
      icon={<ExclamationTriangleIcon />}
      onClick={() => undefined}
    >
      Migration required
    </Label>
  </Popover>
);

export default WorkbenchMigrationLabel;

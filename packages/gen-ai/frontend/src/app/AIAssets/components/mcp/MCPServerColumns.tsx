import React from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { SortableData } from 'mod-arch-shared';
import { MCPServer } from '~/app/types';

const MCPServerColumns: SortableData<MCPServer>[] = [
  {
    field: 'checkbox',
    label: '',
    sortable: false,
    width: 10,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 60,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
    width: 15,
  },
  {
    field: 'endpoint',
    label: 'Endpoint',
    sortable: false,
    width: 15,
  },
  {
    field: 'source',
    label: 'Source',
    sortable: false,
    width: 15,
    info: {
      popover: (
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Registered</DescriptionListTerm>
            <DescriptionListDescription>
              Servers from your organization&apos;s MCP registry, managed centrally.
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Manual</DescriptionListTerm>
            <DescriptionListDescription>
              Servers configured directly in this workspace.
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      ),
      ariaLabel: 'Server source types',
      popoverProps: {
        headerContent: 'Server source types',
      },
    },
  },
  {
    field: 'version',
    label: 'Version',
    sortable: false,
    width: 15,
  },
];

export default MCPServerColumns;

import * as React from 'react';
import { Content, ContentVariants, Label, Stack, StackItem } from '@patternfly/react-core';
import { SortableData } from 'mod-arch-shared';
import { AIModel } from '~/app/types';

const sourceTypePopover = (
  <Stack hasGutter>
    <StackItem>
      <Content component={ContentVariants.dl}>
        <Content component={ContentVariants.dt}>
          <Label color="blue" isCompact>
            MaaS
          </Label>
        </Content>
        <Content component={ContentVariants.dd}>
          Model as a Service &mdash; managed by an admin and shared across projects via the API
          gateway.
        </Content>
        <Content component={ContentVariants.dt}>
          <Label color="grey" isCompact>
            Internal
          </Label>
        </Content>
        <Content component={ContentVariants.dd}>Deployed and served within your cluster.</Content>
      </Content>
    </StackItem>
  </Stack>
);

export const aiModelColumns: SortableData<AIModel>[] = [
  {
    field: 'model_name',
    label: 'Model deployment name',
    sortable: true,
    width: 20,
  },
  {
    field: 'model_source_type',
    label: 'Source',
    sortable: false,
    width: 10,
    info: {
      popover: sourceTypePopover,
      popoverProps: {
        headerContent: 'Model source types',
        minWidth: '400px',
      },
      ariaLabel: 'Model source types help',
    },
  },
  {
    field: 'endpoints',
    label: 'Endpoints',
    sortable: false,
    width: 15,
  },
  {
    field: 'model_type',
    label: 'Model type',
    sortable: false,
    width: 10,
  },
  {
    field: 'usecase',
    label: 'Use case',
    sortable: false,
    width: 15,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
    width: 10,
  },
  {
    field: 'playground',
    label: 'Playground',
    sortable: false,
    width: 20,
  },
];

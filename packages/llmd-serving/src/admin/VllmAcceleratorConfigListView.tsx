import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { Table } from '@odh-dashboard/ui-core';
import { columns } from './columns';
import VllmAcceleratorConfigTableRow from './VllmAcceleratorConfigTableRow';
import { VllmAcceleratorConfigContext } from './VllmAcceleratorConfigContext';
import type { LLMInferenceServiceConfigKind } from '../types';

const VllmAcceleratorConfigListView: React.FC = () => {
  const { configs } = React.useContext(VllmAcceleratorConfigContext);

  return (
    <Table
      data={configs}
      columns={columns}
      rowRenderer={(config: LLMInferenceServiceConfigKind, rowIndex: number) => (
        <VllmAcceleratorConfigTableRow key={config.metadata.uid} obj={config} rowIndex={rowIndex} />
      )}
      toolbarContent={
        <ToolbarItem>
          <Button
            data-testid="add-accelerator-config-button"
            isDisabled
            // TODO: Wire up add/duplicate form in a follow-up PR
            onClick={() => undefined}
          >
            Add vLLM accelerator configuration
          </Button>
        </ToolbarItem>
      }
    />
  );
};

export default VllmAcceleratorConfigListView;

import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { Table } from '@odh-dashboard/ui-core';
import { columns } from './columns';
import LlmAcceleratorConfigTableRow from './LlmAcceleratorConfigTableRow';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';
import type { LLMInferenceServiceConfigKind } from '../types';

const LlmAcceleratorConfigListView: React.FC = () => {
  const { configs } = React.useContext(LlmAcceleratorConfigContext);

  return (
    <Table
      data={configs}
      columns={columns}
      rowRenderer={(config: LLMInferenceServiceConfigKind, rowIndex: number) => (
        <LlmAcceleratorConfigTableRow key={config.metadata.uid} obj={config} rowIndex={rowIndex} />
      )}
      toolbarContent={
        <ToolbarItem>
          <Button
            data-testid="add-accelerator-config-button"
            isDisabled
            // TODO: Wire up add/duplicate form in a follow-up PR
            onClick={() => undefined}
          >
            Add LLM accelerator configuration
          </Button>
        </ToolbarItem>
      }
    />
  );
};

export default LlmAcceleratorConfigListView;

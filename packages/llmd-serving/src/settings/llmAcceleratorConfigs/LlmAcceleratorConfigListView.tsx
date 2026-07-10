import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { Table } from '@odh-dashboard/ui-core';
import { columns } from './columns';
import LlmAcceleratorConfigTableRow from './LlmAcceleratorConfigTableRow';
import DeleteLlmAcceleratorConfigModal from './DeleteLlmAcceleratorConfigModal';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';
import type { LLMInferenceServiceConfigKind } from '../../types';

const LlmAcceleratorConfigListView: React.FC = () => {
  const navigate = useNavigate();
  const { configs } = React.useContext(LlmAcceleratorConfigContext);
  const [deleteConfig, setDeleteConfig] = React.useState<LLMInferenceServiceConfigKind>();

  return (
    <>
      <Table
        data={configs}
        columns={columns}
        rowRenderer={(config: LLMInferenceServiceConfigKind, rowIndex: number) => (
          <LlmAcceleratorConfigTableRow
            key={config.metadata.name}
            obj={config}
            rowIndex={rowIndex}
            onDeleteConfig={setDeleteConfig}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <Button data-testid="add-accelerator-config-button" onClick={() => navigate('add')}>
              Add LLM accelerator configuration
            </Button>
          </ToolbarItem>
        }
      />
      {deleteConfig ? (
        <DeleteLlmAcceleratorConfigModal
          config={deleteConfig}
          onClose={() => setDeleteConfig(undefined)}
        />
      ) : null}
    </>
  );
};

export default LlmAcceleratorConfigListView;

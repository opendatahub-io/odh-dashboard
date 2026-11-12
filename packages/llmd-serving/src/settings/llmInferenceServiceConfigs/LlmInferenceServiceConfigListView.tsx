import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { Table } from '@odh-dashboard/ui-core';
import { columns } from './columns';
import LlmInferenceServiceConfigTableRow from './LlmInferenceServiceConfigTableRow';
import DeleteLlmInferenceServiceConfigModal from './DeleteLlmInferenceServiceConfigModal';
import { LlmInferenceServiceConfigContext } from './LlmInferenceServiceConfigContext';
import type { LLMInferenceServiceConfigKind } from '../../types';

const LlmInferenceServiceConfigListView: React.FC = () => {
  const { configs } = React.useContext(LlmInferenceServiceConfigContext);
  const [deleteConfig, setDeleteConfig] = React.useState<LLMInferenceServiceConfigKind>();

  return (
    <>
      <Table
        data={configs}
        columns={columns}
        rowRenderer={(config: LLMInferenceServiceConfigKind, rowIndex: number) => (
          <LlmInferenceServiceConfigTableRow
            key={config.metadata.name}
            obj={config}
            rowIndex={rowIndex}
            onDeleteConfig={setDeleteConfig}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <Button
              data-testid="add-inference-service-config-button"
              component={(props) => <Link {...props} to="add" />}
            >
              Add LLM inference service configuration
            </Button>
          </ToolbarItem>
        }
      />
      {deleteConfig ? (
        <DeleteLlmInferenceServiceConfigModal
          config={deleteConfig}
          onClose={() => setDeleteConfig(undefined)}
        />
      ) : null}
    </>
  );
};

export default LlmInferenceServiceConfigListView;

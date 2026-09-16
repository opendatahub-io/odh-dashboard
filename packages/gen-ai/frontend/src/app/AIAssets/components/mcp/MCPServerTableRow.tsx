import * as React from 'react';
import { Truncate, Button } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckboxTd, TruncatedText } from 'mod-arch-shared';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import { MCPServer } from '~/app/types';
import MCPServerStatus from './MCPServerStatus';
import MCPServerEndpointPopover from './MCPServerEndpointPopover';

interface MCPServerTableRowProps {
  server: MCPServer;
  isChecked: boolean;
  onToggleCheck: () => void;
  statusInfo?: ServerStatusInfo;
  isStatusLoading?: boolean;
}

const SOURCE_LABELS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    configmap: 'Manual',
    registry: 'Registered',
  }),
);

const MCPServerTableRow: React.FC<MCPServerTableRowProps> = ({
  server,
  isChecked,
  onToggleCheck,
  statusInfo,
  isStatusLoading = false,
}) => (
  <Tr>
    <CheckboxTd id={server.id} isChecked={isChecked} onToggle={onToggleCheck} />
    <Td dataLabel="Name">
      <div>
        <div className="pf-v6-u-font-weight-bold">
          <Truncate content={server.name} />
        </div>
        <TruncatedText className="pf-v6-u-w-75" maxLines={3} content={server.description} />
      </div>
    </Td>
    <Td dataLabel="Status" className="pf-v6-u-align-content-center">
      <MCPServerStatus
        status={statusInfo?.status || 'unknown'}
        message={statusInfo?.message || 'Status unknown'}
        isLoading={isStatusLoading}
      />
    </Td>
    <Td dataLabel="Endpoint" className="pf-v6-u-align-content-center">
      <MCPServerEndpointPopover connectionUrl={server.connectionUrl} source={server.source}>
        <Button variant="link" style={{ textDecoration: 'none' }}>
          {server.endpoint}
        </Button>
      </MCPServerEndpointPopover>
    </Td>
    <Td dataLabel="Source">
      {(server.source && SOURCE_LABELS.get(server.source)) ?? server.source ?? '-'}
    </Td>
    <Td dataLabel="Version">{server.version || '-'}</Td>
  </Tr>
);

export default MCPServerTableRow;

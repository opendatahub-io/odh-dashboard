import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  PageSection,
  Content,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Alert,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CubesIcon } from '@patternfly/react-icons';

type AgentRuntime = {
  name: string;
  namespace: string;
  status: string;
  type: string;
  endpointUrl: string;
  lastSyncTime: string;
  displayName?: string;
  description?: string;
  framework?: string;
};

const BFF_BASE = '/agent-ops/api/v1';

const statusColor = (status: string): 'green' | 'blue' | 'orange' | 'red' | 'grey' => {
  switch (status) {
    case 'Ready':
      return 'green';
    case 'Pending':
    case 'Creating':
      return 'blue';
    case 'Suspended':
      return 'orange';
    case 'Failed':
    case 'Error':
      return 'red';
    default:
      return 'grey';
  }
};

const AgentDeploymentsPage: React.FC = () => {
  const [agents, setAgents] = React.useState<AgentRuntime[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAgents = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BFF_BASE}/agents/runtimes`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }
      const json = await res.json();
      setAgents(json.data?.runtimes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (loading) {
    return (
      <PageSection>
        <Spinner aria-label="Loading agents" />
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant="danger" title="Failed to load agents" isInline>
          {error}
        </Alert>
      </PageSection>
    );
  }

  if (agents.length === 0) {
    return (
      <PageSection>
        <EmptyState
          titleText="No agent deployments"
          icon={CubesIcon}
          variant={EmptyStateVariant.full}
        >
          <EmptyStateBody>
            <Content component="p">Deploy an agent to get started.</Content>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button variant="secondary" onClick={fetchAgents}>
              Refresh
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <Table aria-label="Agent deployments">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Namespace</Th>
            <Th>Status</Th>
            <Th>Framework</Th>
            <Th>Last sync</Th>
          </Tr>
        </Thead>
        <Tbody>
          {agents.map((agent) => (
            <Tr key={`${agent.namespace}/${agent.name}`}>
              <Td dataLabel="Name">{agent.displayName || agent.name}</Td>
              <Td dataLabel="Namespace">{agent.namespace}</Td>
              <Td dataLabel="Status">
                <Label color={statusColor(agent.status)}>{agent.status}</Label>
              </Td>
              <Td dataLabel="Framework">{agent.framework || '-'}</Td>
              <Td dataLabel="Last sync">
                {agent.lastSyncTime ? new Date(agent.lastSyncTime).toLocaleString() : '-'}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </PageSection>
  );
};

export default AgentDeploymentsPage;

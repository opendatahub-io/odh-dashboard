import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import {
  mockAgentRuntime,
  mockAgentRuntimeDetail,
  mockSparseAgentRuntimeDetail,
} from '~/__mocks__/mockAgentRuntime';
import AgentRuntimeOverviewCard from '~/app/components/AgentRuntimeOverviewCard';

describe('AgentRuntimeOverviewCard', () => {
  it('should render runtime overview fields for a full detail payload', () => {
    render(<AgentRuntimeOverviewCard detail={mockAgentRuntimeDetail()} />);

    expect(screen.getByTestId('agent-runtime-overview-card')).toBeInTheDocument();
    expect(screen.getByTestId('agent-runtime-display-name')).toHaveTextContent(
      'Sample Support Agent',
    );
    expect(screen.getByTestId('agent-runtime-framework')).toHaveTextContent('langgraph');
    expect(screen.getByTestId('agent-runtime-resource-type')).toHaveTextContent('agent');
    expect(screen.getByTestId('agent-runtime-workload-status')).toHaveTextContent('ready');
    expect(screen.getByTestId('agent-runtime-service-fqdn')).toBeInTheDocument();
    expect(screen.getByTestId('agent-runtime-service-fqdn-copy')).toHaveTextContent(
      'sample-support-agent.agent-ops-demo.svc.cluster.local',
    );
    expect(screen.getByTestId('agent-runtime-endpoint-http')).toBeInTheDocument();
    expect(screen.getByTestId('agent-runtime-endpoint-copy-http')).toHaveTextContent(
      'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
    );
  });

  it('should render sparse sandbox detail without service endpoints', () => {
    render(<AgentRuntimeOverviewCard detail={mockSparseAgentRuntimeDetail()} />);

    expect(screen.getByTestId('agent-runtime-resource-type')).toHaveTextContent('agent');
    expect(screen.getByTestId('agent-runtime-workload-status')).toHaveTextContent('pending');
    expect(screen.queryByTestId('agent-runtime-endpoint-http')).not.toBeInTheDocument();
  });

  it('should fall back to runtime fields when detail metadata is empty', () => {
    const runtime = mockAgentRuntime({
      displayName: 'Runtime Display Name',
      framework: 'crewai',
      serviceFqdn: 'agent.agent-ops-demo.svc.cluster.local',
      ports: [
        {
          name: 'https',
          url: 'https://agent.agent-ops-demo.svc.cluster.local:8443',
          port: 8443,
        },
      ],
    });

    render(
      <AgentRuntimeOverviewCard
        detail={mockAgentRuntimeDetail({
          displayName: '  ',
          framework: '',
          serviceFqdn: '',
          serviceEndpoints: [],
          runtime,
          workloadStatus: 'ready',
        })}
      />,
    );

    expect(screen.getByTestId('agent-runtime-display-name')).toHaveTextContent(
      'Runtime Display Name',
    );
    expect(screen.getByTestId('agent-runtime-framework')).toHaveTextContent('crewai');
    expect(screen.getByTestId('agent-runtime-endpoint-https')).toBeInTheDocument();
    expect(screen.getByTestId('agent-runtime-endpoint-copy-https')).toHaveTextContent(
      'https://agent.agent-ops-demo.svc.cluster.local:8443',
    );
  });
});

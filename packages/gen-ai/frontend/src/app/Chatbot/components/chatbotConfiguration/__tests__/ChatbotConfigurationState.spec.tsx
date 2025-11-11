import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatbotConfigurationState from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationState';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/hooks/useFetchLSDStatus');

const mockUseFetchLSDStatus = jest.mocked(useFetchLSDStatus);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <GenAiContext.Provider value={mockGenAiContextValue}>{children}</GenAiContext.Provider>
  </MemoryRouter>
);

describe('ChatbotConfigurationState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initializing state with spinner', () => {
    mockUseFetchLSDStatus.mockReturnValue({
      data: {
        phase: 'Initializing',
        name: 'test-lsd',
        version: '1.0.0',
        distributionConfig: {
          activeDistribution: 'test-dist',
          providers: [],
          availableDistributions: {},
        },
      },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationState />
      </TestWrapper>,
    );

    expect(screen.getByText('Creating playground')).toBeInTheDocument();
  });

  it('renders ready state', async () => {
    mockUseFetchLSDStatus.mockReturnValue({
      data: {
        phase: 'Ready',
        name: 'test-lsd',
        version: '1.0.0',
        distributionConfig: {
          activeDistribution: 'test-dist',
          providers: [],
          availableDistributions: {},
        },
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationState />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Playground created')).toBeInTheDocument();
    });
  });

  it('renders failed state', () => {
    mockUseFetchLSDStatus.mockReturnValue({
      data: {
        phase: 'Failed',
        name: 'test-lsd',
        version: '1.0.0',
        distributionConfig: {
          activeDistribution: 'test-dist',
          providers: [],
          availableDistributions: {},
        },
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationState />
      </TestWrapper>,
    );

    expect(screen.getByText('Playground creation failed')).toBeInTheDocument();
  });

  it('shows playground link when redirectToPlayground is true and phase is Ready', async () => {
    mockUseFetchLSDStatus.mockReturnValue({
      data: {
        phase: 'Ready',
        name: 'test-lsd',
        version: '1.0.0',
        distributionConfig: {
          activeDistribution: 'test-dist',
          providers: [],
          availableDistributions: {},
        },
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationState redirectToPlayground />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Go to playground')).toBeInTheDocument();
    });

    const link = screen.getByText('Go to playground');
    expect(link).toHaveAttribute('href', '/gen-ai-studio/playground/test-namespace');
  });

  it('does not show playground link when redirectToPlayground is false', () => {
    mockUseFetchLSDStatus.mockReturnValue({
      data: {
        phase: 'Ready',
        name: 'test-lsd',
        version: '1.0.0',
        distributionConfig: {
          activeDistribution: 'test-dist',
          providers: [],
          availableDistributions: {},
        },
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationState redirectToPlayground={false} />
      </TestWrapper>,
    );

    expect(screen.queryByText('Go to playground')).not.toBeInTheDocument();
  });

  it('does not show playground link when phase is not Ready', () => {
    mockUseFetchLSDStatus.mockReturnValue({
      data: {
        phase: 'Initializing',
        name: 'test-lsd',
        version: '1.0.0',
        distributionConfig: {
          activeDistribution: 'test-dist',
          providers: [],
          availableDistributions: {},
        },
      },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    render(
      <TestWrapper>
        <ChatbotConfigurationState redirectToPlayground />
      </TestWrapper>,
    );

    expect(screen.queryByText('Go to playground')).not.toBeInTheDocument();
  });
});

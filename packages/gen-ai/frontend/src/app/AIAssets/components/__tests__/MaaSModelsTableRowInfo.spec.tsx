/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { MaaSModel } from '~/odh/extension-points/maas';
import MaaSModelsTableRowInfo from '~/app/AIAssets/components/MaaSModelsTableRowInfo';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('mod-arch-shared', () => ({
  ...jest.requireActual('mod-arch-shared'),
  DashboardPopupIconButton: ({
    icon,
    onClick,
    children,
    ...props
  }: {
    icon: React.ReactNode;
    onClick?: () => void;
    children?: React.ReactNode;
  }) => (
    <button onClick={onClick} {...props}>
      {icon}
      {children}
    </button>
  ),
}));

// Mock ClipboardCopy to trigger onCopy callback
jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    ClipboardCopy: ({
      children,
      onCopy,
      'data-testid': dataTestId,
      ...props
    }: {
      children: string;
      onCopy?: (event: React.ClipboardEvent<HTMLDivElement>, text?: React.ReactNode) => void;
      'data-testid'?: string;
      [key: string]: unknown;
    }) => {
      const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onCopy) {
          onCopy(e as unknown as React.ClipboardEvent<HTMLDivElement>, children);
        }
      };
      return (
        <div data-testid={dataTestId}>
          <input readOnly value={children} />
          <button
            aria-label={(props['aria-label'] as string) || 'Copy to clipboard'}
            onClick={handleClick}
            data-testid={dataTestId ? `${dataTestId}-copy-button` : undefined}
          >
            Copy
          </button>
        </div>
      );
    },
  };
});

const createMockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'test-maas-model-id',
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
  ready: true,
  url: 'https://maas.example.com/model',
  display_name: 'Test MaaS Model Display Name',
  description: 'A test MaaS model for unit testing',
  usecase: 'Code generation, Text completion',
  ...overrides,
});

describe('MaaSModelsTableRowInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render model display name', () => {
    const model = createMockMaaSModel({ display_name: 'My Custom MaaS Model' });
    render(<MaaSModelsTableRowInfo model={model} />);

    expect(screen.getByText('My Custom MaaS Model')).toBeInTheDocument();
  });

  it('should render model ID as fallback when display name is not available', () => {
    const model = createMockMaaSModel({ display_name: undefined, id: 'fallback-model-id' });
    render(<MaaSModelsTableRowInfo model={model} />);

    expect(screen.getByText('fallback-model-id')).toBeInTheDocument();
  });

  it('should render info icon button', () => {
    const model = createMockMaaSModel();
    render(<MaaSModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('maas-model-id-icon-button');
    expect(infoButton).toBeInTheDocument();
  });

  it('should render MaaS label', () => {
    const model = createMockMaaSModel();
    render(<MaaSModelsTableRowInfo model={model} />);

    expect(screen.getByText('MaaS')).toBeInTheDocument();
  });

  it('should show popover with model ID when info button is clicked', async () => {
    const user = userEvent.setup();
    const model = createMockMaaSModel({ id: 'unique-maas-model-id' });
    render(<MaaSModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('maas-model-id-icon-button');
    await user.click(infoButton);

    expect(screen.getByText(/The model ID is a unique identifier required/i)).toBeInTheDocument();
    expect(screen.getByText('Model ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('unique-maas-model-id')).toBeInTheDocument();
  });

  it('should render ClipboardCopy component with model ID', async () => {
    const user = userEvent.setup();
    const model = createMockMaaSModel({ id: 'test-maas-model-id-456' });
    render(<MaaSModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('maas-model-id-icon-button');
    await user.click(infoButton);

    const clipboardInput = screen.getByDisplayValue('test-maas-model-id-456');
    expect(clipboardInput).toBeInTheDocument();
  });

  it('should render model info with correct structure', () => {
    const model = createMockMaaSModel({
      display_name: 'Test MaaS Display',
      id: 'test-maas-id',
    });
    render(<MaaSModelsTableRowInfo model={model} />);

    expect(screen.getByText('Test MaaS Display')).toBeInTheDocument();
    expect(screen.getByTestId('maas-model-id-icon-button')).toBeInTheDocument();
    expect(screen.getByText('MaaS')).toBeInTheDocument();
  });

  it('should show explanation text in popover', async () => {
    const user = userEvent.setup();
    const model = createMockMaaSModel();
    render(<MaaSModelsTableRowInfo model={model} />);

    const infoButton = screen.getByTestId('maas-model-id-icon-button');
    await user.click(infoButton);

    expect(
      screen.getByText(/unique identifier required to locate and access this model/i),
    ).toBeInTheDocument();
  });

  describe('Event Tracking', () => {
    it('should fire Model_ID_Copied event when model ID is copied', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel({ id: 'test-maas-copy-id' });
      render(<MaaSModelsTableRowInfo model={model} />);

      const infoButton = screen.getByTestId('maas-model-id-icon-button');
      await user.click(infoButton);

      jest.clearAllMocks();

      const copyButton = screen.getByRole('button', { name: /copy model id/i });
      await user.click(copyButton);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Model Id Copied', {
        assetType: 'maas_model',
        assetId: 'test-maas-copy-id',
      });
    });
  });

  describe('Clipboard functionality', () => {
    let writeTextSpy: jest.SpyInstance;

    beforeEach(() => {
      writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    });

    afterEach(() => {
      writeTextSpy.mockRestore();
    });

    it('should copy model ID to clipboard when copy button is clicked', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel({ id: 'unique-maas-model-id-789' });
      render(<MaaSModelsTableRowInfo model={model} />);

      const infoButton = screen.getByTestId('maas-model-id-icon-button');
      await user.click(infoButton);

      const copyButton = screen.getByTestId('clipboard-copy-maas-model-id-copy-button');
      await user.click(copyButton);

      expect(writeTextSpy).toHaveBeenCalledWith('unique-maas-model-id-789');
    });
  });
});

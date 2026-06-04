import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMockTabExtension } from './mockExtensions';
import { ExtensibleDetailTabs } from '../ExtensibleDetailTabs';

describe('ExtensibleDetailTabs', () => {
  const defaultOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no tabs exist', () => {
    const { container } = render(
      <ExtensibleDetailTabs activeKey="overview" onSelect={defaultOnSelect} extensionTabs={[]} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render single static tab content directly without tab bar', () => {
    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div data-testid="overview-content">Overview Content</div>,
          },
        ]}
        extensionTabs={[]}
      />,
    );

    expect(screen.getByTestId('overview-content')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('should render single extension tab content directly without tab bar', async () => {
    const extensionTabs = [createMockTabExtension('deployments', 'Deployments')];

    render(
      <ExtensibleDetailTabs
        activeKey="deployments"
        onSelect={defaultOnSelect}
        extensionTabs={extensionTabs}
      />,
    );

    expect(await screen.findByTestId('mock-tab-content')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('should render tab bar with multiple static tabs', () => {
    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div data-testid="overview-inner">Overview content</div>,
          },
          {
            id: 'versions',
            title: 'Versions',
            content: <div data-testid="versions-inner">Versions content</div>,
          },
        ]}
        extensionTabs={[]}
        testId="test-tabs"
      />,
    );

    expect(screen.getByTestId('test-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.getByTestId('versions-tab')).toBeInTheDocument();
  });

  it('should render extension tabs alongside static tabs', () => {
    const extensionTabs = [createMockTabExtension('deployments', 'Deployments')];

    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div data-testid="overview-inner">Overview content</div>,
          },
        ]}
        extensionTabs={extensionTabs}
        testId="test-tabs"
      />,
    );

    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.getByTestId('deployments-tab')).toBeInTheDocument();
  });

  it('should call onSelect when a tab is clicked', () => {
    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div data-testid="overview-inner">Overview content</div>,
          },
          {
            id: 'versions',
            title: 'Versions',
            content: <div data-testid="versions-inner">Versions content</div>,
          },
        ]}
        extensionTabs={[]}
      />,
    );

    fireEvent.click(screen.getByTestId('versions-tab'));
    expect(defaultOnSelect).toHaveBeenCalledWith('versions');
  });

  it('should filter extension tabs using filterExtension callback', () => {
    const extensionTabs = [
      createMockTabExtension('deployments', 'Deployments'),
      createMockTabExtension('hidden', 'Hidden'),
    ];

    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div data-testid="overview-inner">Overview content</div>,
          },
        ]}
        extensionTabs={extensionTabs}
        filterExtension={(ext) => ext.properties.id !== 'hidden'}
        testId="test-tabs"
      />,
    );

    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.getByTestId('deployments-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('hidden-tab')).not.toBeInTheDocument();
  });

  it('should apply custom ariaLabel', () => {
    render(
      <ExtensibleDetailTabs
        activeKey="tab-1"
        onSelect={defaultOnSelect}
        staticTabs={[
          { id: 'tab-1', title: 'Tab 1', content: <div>Content 1</div> },
          { id: 'tab-2', title: 'Tab 2', content: <div>Content 2</div> },
        ]}
        extensionTabs={[]}
        ariaLabel="Model details tabs"
      />,
    );

    expect(screen.getByRole('region', { name: 'Model details tabs' })).toBeInTheDocument();
  });

  it('should render Badge when extension has a label', () => {
    const extensionTabs = [createMockTabExtension('metrics', 'Metrics', { label: '3' })];

    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div>Overview</div>,
          },
        ]}
        extensionTabs={extensionTabs}
        testId="test-tabs"
      />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('3').closest('.pf-v6-c-badge')).toBeInTheDocument();
  });

  it('should not render Badge when extension label is undefined', () => {
    const extensionTabs = [createMockTabExtension('metrics', 'Metrics')];

    render(
      <ExtensibleDetailTabs
        activeKey="overview"
        onSelect={defaultOnSelect}
        staticTabs={[
          {
            id: 'overview',
            title: 'Overview',
            content: <div>Overview</div>,
          },
        ]}
        extensionTabs={extensionTabs}
        testId="test-tabs"
      />,
    );

    expect(screen.getByTestId('metrics-tab')).toBeInTheDocument();
    expect(document.querySelector('.pf-v6-c-badge')).toBeNull();
  });
});

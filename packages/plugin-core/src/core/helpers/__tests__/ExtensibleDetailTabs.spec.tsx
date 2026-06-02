import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { DetailTabProperties } from '../../../extension-points/detail-tabs';
import { ExtensibleDetailTabs } from '../ExtensibleDetailTabs';

type TestTabExtension = Extension<'test.details/tab', DetailTabProperties>;

const MockTabContent: React.FC = () => <div data-testid="mock-tab-content">Tab Content</div>;

const createMockTabExtension = (
  id: string,
  title: string,
  group?: string,
): LoadedExtension<TestTabExtension> =>
  ({
    type: 'test.details/tab',
    properties: {
      id,
      title,
      component: () => Promise.resolve({ default: MockTabContent }),
      group,
    },
    uid: `uid-${id}`,
    pluginID: 'test-plugin',
    pluginName: 'test-plugin',
  } as unknown as LoadedExtension<TestTabExtension>);

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
});

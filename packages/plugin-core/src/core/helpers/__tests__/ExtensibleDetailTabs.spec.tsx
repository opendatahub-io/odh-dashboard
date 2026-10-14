import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('should render Label when extension has a label', () => {
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
    expect(screen.getByText('3').closest('.pf-v6-c-label')).toBeInTheDocument();
  });

  it('should not render Label when extension label is undefined', () => {
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
    expect(document.querySelector('.pf-v6-c-label')).toBeNull();
  });

  describe('shouldShow predicate', () => {
    it('should hide extension tabs when shouldShow returns false', async () => {
      const extensionTabs = [
        createMockTabExtension('visible', 'Visible'),
        createMockTabExtension('hidden', 'Hidden', { shouldShow: () => false }),
      ];

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          testId="test-tabs"
        />,
      );

      await waitFor(() => expect(screen.getByTestId('visible-tab')).toBeInTheDocument());
      expect(screen.queryByTestId('hidden-tab')).not.toBeInTheDocument();
    });

    it('should show extension tabs when shouldShow returns true', async () => {
      const extensionTabs = [createMockTabExtension('shown', 'Shown', { shouldShow: () => true })];

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          testId="test-tabs"
        />,
      );

      await waitFor(() => expect(screen.getByTestId('shown-tab')).toBeInTheDocument());
    });

    it('should show extension tabs when shouldShow is not provided', () => {
      const extensionTabs = [createMockTabExtension('default', 'Default')];

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          testId="test-tabs"
        />,
      );

      expect(screen.getByTestId('default-tab')).toBeInTheDocument();
    });

    it('should pass componentProps to shouldShow', async () => {
      const shouldShow = jest.fn().mockReturnValue(true);
      const extensionTabs = [createMockTabExtension('tested', 'Tested', { shouldShow })];
      const componentProps = { modelName: 'test-model', sourceId: 'src-1' };

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          componentProps={componentProps}
        />,
      );

      await waitFor(() => expect(shouldShow).toHaveBeenCalledWith(componentProps));
    });

    it('should show an async tab when shouldShow resolves true', async () => {
      const extensionTabs = [
        createMockTabExtension('async-tab', 'Async Tab', {
          shouldShow: () => Promise.resolve(true),
        }),
      ];

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
        />,
      );

      await waitFor(() => expect(screen.getByTestId('async-tab-tab')).toBeInTheDocument());
    });

    it('should hide an async tab when shouldShow resolves false', async () => {
      const extensionTabs = [
        createMockTabExtension('async-hidden', 'Async Hidden', {
          shouldShow: () => Promise.resolve(false),
        }),
      ];

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
        />,
      );

      await waitFor(() => expect(screen.queryByTestId('async-hidden-tab')).not.toBeInTheDocument());
    });

    it('should keep an active deep-linked tab visible while its predicate is pending', async () => {
      let resolveShow: (value: boolean) => void = () => undefined;
      const shouldShow = jest.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveShow = resolve;
          }),
      );

      render(
        <ExtensibleDetailTabs
          activeKey="insights"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={[createMockTabExtension('insights', 'Insights', { shouldShow })]}
        />,
      );

      expect(screen.getByTestId('insights-tab')).toBeInTheDocument();
      await act(async () => resolveShow(true));
      expect(screen.getByTestId('insights-tab')).toBeInTheDocument();
    });

    it('should redirect to the first visible tab when the active tab is hidden', async () => {
      const onSelect = jest.fn();
      render(
        <ExtensibleDetailTabs
          activeKey="hidden-active"
          onSelect={onSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={[
            createMockTabExtension('hidden-active', 'Hidden Active', { shouldShow: () => false }),
          ]}
        />,
      );

      await waitFor(() => expect(onSelect).toHaveBeenCalledWith('overview'));
    });

    it('should hide a tab when shouldShow throws', async () => {
      const shouldShow = jest.fn(() => {
        throw new Error('predicate failed');
      });
      const onSelect = jest.fn();

      render(
        <ExtensibleDetailTabs
          activeKey="throwing"
          onSelect={onSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={[createMockTabExtension('throwing', 'Throwing', { shouldShow })]}
        />,
      );

      await waitFor(() => expect(screen.queryByTestId('throwing-tab')).not.toBeInTheDocument());
      expect(onSelect).toHaveBeenCalledWith('overview');
    });

    it('should deduplicate async predicates for stable component props', async () => {
      const shouldShow = jest.fn().mockResolvedValue(true);

      render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={[createMockTabExtension('dedup', 'Dedup', { shouldShow })]}
          componentProps={{ modelName: 'model' }}
        />,
      );

      await waitFor(() => expect(screen.getByTestId('dedup-tab')).toBeInTheDocument());
      expect(shouldShow).toHaveBeenCalledTimes(1);
    });

    it('should re-evaluate a tab after component props change', async () => {
      const shouldShow = jest.fn().mockResolvedValue(true);
      const extensionTabs = [createMockTabExtension('deferred', 'Deferred', { shouldShow })];

      const { rerender } = render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          componentProps={{ version: 'v1' }}
        />,
      );

      await waitFor(() => expect(screen.getByTestId('deferred-tab')).toBeInTheDocument());
      rerender(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={defaultOnSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          componentProps={{ version: 'v2' }}
        />,
      );
      await waitFor(() => expect(shouldShow).toHaveBeenCalledTimes(2));
    });

    it('should not use a stale visibility result after component props change', async () => {
      let resolveNext: ((value: boolean) => void) | undefined;
      const shouldShow = jest.fn((props: Record<string, unknown>) => {
        if (props.version === 'v1') {
          return Promise.resolve(false);
        }
        return new Promise<boolean>((resolve) => {
          resolveNext = resolve;
        });
      });
      const onSelect = jest.fn();
      const extensionTabs = [createMockTabExtension('insights', 'Insights', { shouldShow })];

      const { rerender } = render(
        <ExtensibleDetailTabs
          activeKey="overview"
          onSelect={onSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          componentProps={{ version: 'v1' }}
        />,
      );

      await waitFor(() => expect(screen.queryByTestId('insights-tab')).not.toBeInTheDocument());

      rerender(
        <ExtensibleDetailTabs
          activeKey="insights"
          onSelect={onSelect}
          staticTabs={[{ id: 'overview', title: 'Overview', content: <div>Overview</div> }]}
          extensionTabs={extensionTabs}
          componentProps={{ version: 'v2' }}
        />,
      );

      expect(screen.getByTestId('insights-tab')).toBeInTheDocument();
      expect(onSelect).not.toHaveBeenCalledWith('overview');

      await act(async () => resolveNext?.(true));
      expect(screen.getByTestId('insights-tab')).toBeInTheDocument();
    });
  });
});

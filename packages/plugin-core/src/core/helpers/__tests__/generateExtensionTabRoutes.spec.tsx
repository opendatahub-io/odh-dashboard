import * as React from 'react';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { DetailTabProperties } from '../../../extension-points/detail-tabs';
import { generateExtensionTabRoutes } from '../generateExtensionTabRoutes';

type TestTabExtension = Extension<'test.details/tab', DetailTabProperties>;

const createMockTabExtension = (id: string, title: string): LoadedExtension<TestTabExtension> =>
  ({
    type: 'test.details/tab',
    properties: {
      id,
      title,
      component: () => Promise.resolve({ default: () => null }),
    },
    uid: `uid-${id}`,
    pluginID: 'test-plugin',
    pluginName: 'test-plugin',
  } as unknown as LoadedExtension<TestTabExtension>);

describe('generateExtensionTabRoutes', () => {
  it('should generate a route for each tab extension', () => {
    const tabExtensions = [
      createMockTabExtension('overview', 'Overview'),
      createMockTabExtension('details', 'Details'),
    ];

    const routes = generateExtensionTabRoutes({
      tabExtensions,
      renderElement: (tabId) => <div data-testid={`content-${tabId}`} />,
    });

    expect(routes).toHaveLength(2);
    expect(routes[0].key).toBe('overview');
    expect(routes[1].key).toBe('details');
  });

  it('should use extension id as the route path', () => {
    const tabExtensions = [createMockTabExtension('deployments', 'Deployments')];

    const routes = generateExtensionTabRoutes({
      tabExtensions,
      renderElement: (tabId) => <div>{tabId}</div>,
    });

    expect(routes).toHaveLength(1);
    expect(routes[0].props.path).toBe('deployments');
  });

  it('should pass the tab id to renderElement', () => {
    const renderElement = jest.fn((tabId: string) => <div>{tabId}</div>);
    const tabExtensions = [createMockTabExtension('metrics', 'Metrics')];

    generateExtensionTabRoutes({
      tabExtensions,
      renderElement,
    });

    expect(renderElement).toHaveBeenCalledWith('metrics');
  });

  it('should return empty array for empty extensions', () => {
    const routes = generateExtensionTabRoutes({
      tabExtensions: [],
      renderElement: () => <div />,
    });

    expect(routes).toHaveLength(0);
  });
});

import * as React from 'react';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { DetailTabProperties } from '../../../extension-points/detail-tabs';
import type { ActionProperties } from '../../../extension-points/actions';

type TestTabExtension = Extension<'test.details/tab', DetailTabProperties>;
type TestActionExtension = Extension<'test.header/action', ActionProperties>;

const MockTabContent: React.FC = () =>
  React.createElement('div', { 'data-testid': 'mock-tab-content' }, 'Tab Content');

const MockActionComponent: React.FC = () =>
  React.createElement('span', { 'data-testid': 'mock-action' }, 'Action');

export const createMockTabExtension = (
  id: string,
  title: string,
  overrides?: Partial<DetailTabProperties>,
): LoadedExtension<TestTabExtension> =>
  ({
    type: 'test.details/tab',
    properties: {
      id,
      title,
      component: () => Promise.resolve({ default: MockTabContent }),
      ...overrides,
    },
    uid: `uid-${id}`,
    pluginID: 'test-plugin',
    pluginName: 'test-plugin',
  } as unknown as LoadedExtension<TestTabExtension>);

export const createMockActionExtension = (
  id: string,
  label: string,
  overrides?: Partial<ActionProperties>,
): LoadedExtension<TestActionExtension> =>
  ({
    type: 'test.header/action',
    properties: {
      id,
      label,
      component: () => Promise.resolve({ default: MockActionComponent }),
      ...overrides,
    },
    uid: `uid-${id}`,
    pluginID: 'test-plugin',
    pluginName: 'test-plugin',
  } as unknown as LoadedExtension<TestActionExtension>);

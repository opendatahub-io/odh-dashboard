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
): LoadedExtension<TestTabExtension> => {
  const properties: DetailTabProperties = {
    id,
    title,
    component: () => Promise.resolve({ default: MockTabContent }),
    ...overrides,
  };
  return {
    type: 'test.details/tab',
    properties,
    uid: `uid-${id}`,
    pluginName: 'test-plugin',
  } satisfies LoadedExtension<TestTabExtension>;
};

export const createMockActionExtension = (
  id: string,
  label: string,
  overrides?: Partial<ActionProperties>,
): LoadedExtension<TestActionExtension> => {
  const properties: ActionProperties = {
    id,
    label,
    component: () => Promise.resolve({ default: MockActionComponent }),
    ...overrides,
  };
  return {
    type: 'test.header/action',
    properties,
    uid: `uid-${id}`,
    pluginName: 'test-plugin',
  } satisfies LoadedExtension<TestActionExtension>;
};

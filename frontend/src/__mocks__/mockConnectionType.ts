import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
  ConnectionTypeField,
} from '~/concepts/connectionTypes/types';
import { toConnectionTypeConfigMap } from '~/concepts/connectionTypes/utils';

type MockConnectionTypeConfigMap = {
  name?: string;
  namespace?: string;
  displayName?: string;
  description?: string;
  enabled?: boolean;
  username?: string;
  preInstalled?: boolean;
  fields?: ConnectionTypeField[];
  category?: string[];
};

export const mockConnectionTypeConfigMap = (
  options: MockConnectionTypeConfigMap,
): ConnectionTypeConfigMap => toConnectionTypeConfigMap(mockConnectionTypeConfigMapObj(options));

export const mockConnectionTypeConfigMapObj = ({
  name = 'connection-type-sample',
  namespace = 'opendatahub',
  displayName = name.replace(/-/g, ' '),
  description = 'Connection type description',
  enabled = true,
  username = 'dashboard-admin',
  preInstalled = false,
  ...rest
}: MockConnectionTypeConfigMap): ConnectionTypeConfigMapObj => ({
  kind: 'ConfigMap',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
    resourceVersion: '173155965',
    creationTimestamp: '2024-08-29T00:00:00Z',
    labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/connection-type': 'true' },
    annotations: {
      'openshift.io/display-name': displayName,
      'openshift.io/description': description,
      'opendatahub.io/enabled': enabled ? 'true' : 'false',
      'opendatahub.io/username': username || '',
    },
    ...(preInstalled
      ? {
          ownerReferences: [
            {
              apiVersion: 'datasciencecluster.opendatahub.io/v1',
              kind: 'DataScienceCluster',
              name: 'default-dsc',
              uid: '06dd5a40-8473-4d5f-8afa-36885aa26ca9',
              controller: true,
              blockOwnerDeletion: true,
            },
          ],
        }
      : undefined),
  },
  data: {
    category: 'category' in rest ? rest.category : ['Database', 'Testing'],
    fields: 'fields' in rest ? rest.fields : mockFields,
  },
});

const mockFields: ConnectionTypeField[] = [
  {
    type: 'section',
    name: 'Short text',
    description: 'This section contains short text fields.',
  },
  {
    type: 'short-text',
    name: 'Short text 1',
    description: 'Test short text',
    envVar: 'short-text-1',
    required: false,
    properties: {},
  },
  {
    type: 'short-text',
    name: 'Short text 2',
    description: 'Test short text with default value',
    envVar: 'short-text-2',
    required: true,
    properties: {
      defaultValue: 'This is the default value',
      defaultReadOnly: false,
    },
  },
  {
    type: 'short-text',
    name: 'Short text 3',
    description: 'Test short text with default value and read only',
    envVar: 'short-text-3',
    required: false,
    properties: {
      defaultValue: 'This is the default value and is read only',
      defaultReadOnly: true,
    },
  },
  {
    type: 'short-text',
    name: 'Short text 4',
    description: 'Test short text with no default value and read only',
    envVar: 'short-text-4',
    required: false,
    properties: {
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'Text',
    description: 'This section contains text fields.',
  },
  {
    type: 'text',
    name: 'Text 1',
    description: 'Test text',
    envVar: 'text-1',
    required: false,
    properties: {},
  },
  {
    type: 'text',
    name: 'Text 2',
    description: 'Test text with default value',
    envVar: 'text-2',
    required: true,
    properties: {
      defaultValue: 'This is the default value\nOne\nTwo\nThree\nFour',
      defaultReadOnly: false,
    },
  },
  {
    type: 'text',
    name: 'Text 3',
    description: 'Test text with default value and read only',
    envVar: 'text-3',
    required: false,
    properties: {
      defaultValue: 'This is the default value\nOne\nTwo\nThree\nFour',
      defaultReadOnly: true,
    },
  },
  {
    type: 'text',
    name: 'Text 4',
    description: 'Test text with no default value and read only',
    envVar: 'text-4',
    required: false,
    properties: {
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'Hidden',
    description: 'This section contains hidden fields.',
  },
  {
    type: 'hidden',
    name: 'Hidden 1',
    description: 'Test hidden',
    envVar: 'hidden-1',
    required: false,
    properties: {},
  },
  {
    type: 'hidden',
    name: 'Hidden 2',
    description: 'Test hidden with default value',
    envVar: 'hidden-2',
    required: true,
    properties: {
      defaultValue: 'This is the default value',
      defaultReadOnly: false,
    },
  },
  {
    type: 'hidden',
    name: 'Hidden 3',
    description: 'Test hidden with default value and read only',
    envVar: 'hidden-3',
    required: false,
    properties: {
      defaultValue: 'This is the default value',
      defaultReadOnly: true,
    },
  },
  {
    type: 'hidden',
    name: 'Hidden 4',
    description: 'Test hidden with no default value and read only',
    envVar: 'hidden-4',
    required: false,
    properties: {
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'URI',
    description: 'This section contains URI fields.',
  },
  {
    type: 'uri',
    name: 'URI 1',
    description: 'Test URI',
    envVar: 'uri-1',
    required: false,
    properties: {},
  },
  {
    type: 'uri',
    name: 'URI 2',
    description: 'Test URI with default value',
    envVar: 'uri-2',
    required: true,
    properties: {
      defaultValue: 'https://www.redhat.com',
      defaultReadOnly: false,
    },
  },
  {
    type: 'uri',
    name: 'URI 3',
    description: 'Test URI with default value and read only',
    envVar: 'uri-3',
    required: false,
    properties: {
      defaultValue: 'https://www.redhat.com',
      defaultReadOnly: true,
    },
  },
  {
    type: 'uri',
    name: 'URI 4',
    description: 'Test URI with no default value and read only',
    envVar: 'uri-4',
    required: false,
    properties: {
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'File',
    description: 'This section contains file fields.',
  },
  {
    type: 'file',
    name: 'File 1',
    description: 'Test file',
    envVar: 'file-1',
    required: false,
    properties: {},
  },
  {
    type: 'file',
    name: 'File 2',
    description: 'Test file with default value',
    envVar: 'file-2',
    required: true,
    properties: {
      defaultValue: 'This is the default value',
      defaultReadOnly: false,
    },
  },
  {
    type: 'file',
    name: 'File 3',
    description: 'Test file with default value and read only',
    envVar: 'file-3',
    required: false,
    properties: {
      defaultValue: 'This is the default value',
      defaultReadOnly: true,
    },
  },
  {
    type: 'file',
    name: 'File 4',
    description: 'Test file with no default value and read only',
    envVar: 'file-4',
    required: false,
    properties: {
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'Boolean',
    description: 'This section contains boolean fields.',
  },
  {
    type: 'boolean',
    name: 'Boolean 1',
    description: 'Test boolean',
    envVar: 'boolean-1',
    required: false,
    properties: {},
  },
  {
    type: 'boolean',
    name: 'Boolean 2',
    description: 'Test boolean with default value',
    envVar: 'boolean-2',
    required: true,
    properties: {
      label: 'Input label',
      defaultValue: true,
      defaultReadOnly: false,
    },
  },
  {
    type: 'boolean',
    name: 'Boolean 3',
    description: 'Test boolean with default value and read only',
    envVar: 'boolean-3',
    required: false,
    properties: {
      label: 'Input label',
      defaultValue: true,
      defaultReadOnly: true,
    },
  },
  {
    type: 'boolean',
    name: 'Boolean 4',
    description: 'Test boolean with no default value and read only',
    envVar: 'boolean-4',
    required: false,
    properties: {
      label: 'Input label',
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'Numeric',
    description: 'This section contains numeric fields.',
  },
  {
    type: 'numeric',
    name: 'Numeric 1',
    description: 'Test numeric',
    envVar: 'numeric-1',
    required: false,
    properties: {},
  },
  {
    type: 'numeric',
    name: 'Numeric 2',
    description: 'Test numeric with default value',
    envVar: 'numeric-2',
    required: true,
    properties: {
      defaultValue: 2,
      defaultReadOnly: false,
    },
  },
  {
    type: 'numeric',
    name: 'Numeric 3',
    description: 'Test numeric with default value and read only',
    envVar: 'numeric-3',
    required: false,
    properties: {
      defaultValue: 2,
      defaultReadOnly: true,
    },
  },
  {
    type: 'numeric',
    name: 'Numeric 4',
    description: 'Test numeric with no default value and read only',
    envVar: 'numeric-4',
    required: false,
    properties: {
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'Dropdown - single',
    description: 'This section contains single variant dropdown fields.',
  },
  {
    type: 'dropdown',
    name: 'Dropdown single 1',
    description: 'Test dropdown single variant',
    envVar: 'dropdown-single-1',
    required: false,
    properties: {
      variant: 'single',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown single 2',
    description: 'Test dropdown single variant with default value',
    envVar: 'dropdown-2',
    required: true,
    properties: {
      variant: 'single',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
      defaultValue: ['3'],
      defaultReadOnly: false,
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown single 3',
    description: 'Test dropdown single variant with default value and read only',
    envVar: 'dropdown-3',
    required: true,
    properties: {
      variant: 'single',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
      defaultValue: ['3'],
      defaultReadOnly: true,
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown single 4',
    description: 'Test dropdown single variant with no default value and read only',
    envVar: 'dropdown-4',
    required: true,
    properties: {
      variant: 'single',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
      defaultReadOnly: true,
    },
  },

  {
    type: 'section',
    name: 'Dropdown - multi',
    description: 'This section contains multi variant dropdown fields.',
  },
  {
    type: 'dropdown',
    name: 'Dropdown multi 1',
    description: 'Test dropdown multi variant',
    envVar: 'dropdown-multi-1',
    required: false,
    properties: {
      variant: 'multi',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown multi 2',
    description: 'Test dropdown multi variant with default values',
    envVar: 'dropdown-multi-2',
    required: false,
    properties: {
      variant: 'multi',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
      defaultValue: ['2', '3'],
      defaultReadOnly: false,
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown multi 3',
    description: 'Test dropdown multi variant with default values and read only',
    envVar: 'dropdown-multi-3',
    required: false,
    properties: {
      variant: 'multi',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
      defaultValue: ['2', '3'],
      defaultReadOnly: true,
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown multi 4',
    description: 'Test dropdown multi variant with no default values and read only',
    envVar: 'dropdown-multi-4',
    required: false,
    properties: {
      variant: 'multi',
      items: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
      ],
      defaultReadOnly: true,
    },
  },
];

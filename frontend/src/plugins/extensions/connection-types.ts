import type {
  ConnectionTypesServiceExtension,
  ConnectionTypeFormFieldsExtension,
  ConnectionDetailsHelperTextExtension,
  DefaultValueTextRendererExtension,
  ConnectionTypeFormExtension,
} from '@odh-dashboard/plugin-core/extension-points';

type ConnectionTypeExtension =
  | ConnectionTypesServiceExtension
  | ConnectionTypeFormFieldsExtension
  | ConnectionDetailsHelperTextExtension
  | DefaultValueTextRendererExtension
  | ConnectionTypeFormExtension;

const extensions: ConnectionTypeExtension[] = [
  {
    type: 'app.connection-types/service',
    properties: {
      fetchConnectionTypes: () =>
        import('#~/services/connectionTypesService').then((m) => m.fetchConnectionTypes),
      fetchConnections: () => import('#~/services/fetchConnections').then((m) => m.default),
    },
  },
  {
    type: 'app.connection-types/form-fields',
    properties: {
      component: () => import('#~/concepts/connectionTypes/fields/ConnectionTypeFormFields'),
    },
  },
  {
    type: 'app.connection-types/details-helper',
    properties: {
      component: () => import('#~/concepts/connectionTypes/ConnectionDetailsHelperText'),
    },
  },
  {
    type: 'app.connection-types/default-value-renderer',
    properties: {
      component: () => import('#~/concepts/connectionTypes/fields/DefaultValueTextRenderer'),
    },
  },
  {
    type: 'app.connection-types/form',
    properties: {
      component: () => import('#~/concepts/connectionTypes/ConnectionTypeForm'),
    },
  },
];

export default extensions;

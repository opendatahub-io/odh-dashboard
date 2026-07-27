/* eslint-disable @odh-dashboard/no-restricted-imports -- re-exporting shared types for backward compatibility */
export {
  ConnectionTypeFieldType,
  connectionTypeDataFields,
  AwsKeys,
  AccessTypes,
} from '@odh-dashboard/k8s-core';
export type {
  ConnectionTypeDataFieldTypeUnion,
  ConnectionTypeFieldTypeUnion,
  ConnectionTypeCommonProperties,
  DataField,
  SectionField,
  HiddenField,
  ShortTextField,
  TextField,
  UriField,
  FileField,
  BooleanField,
  DropdownField,
  NumericField,
  ConnectionTypeField,
  ConnectionTypeDataField,
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
  Connection,
  ConnectionTypeFormData,
  AWSDataEntry,
  FieldMode,
} from '@odh-dashboard/k8s-core';

// Connection test status lifecycle
export enum ConnectionTestStatus {
  NOT_TESTED = 'not-tested',
  TESTING = 'testing',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

// API request/response types (matching OpenAPI spec)
export type ConnectionTestRequest = {
  connectionType: string;
  fieldValues: Record<string, string>;
};

export type ConnectionTestResult = {
  success: boolean;
  error?: string;
  message: string;
};

// K8s annotation keys for persisted test status
export const CONNECTION_TEST_ANNOTATIONS = {
  STATUS: 'opendatahub.io/connection-test-status',
  TIMESTAMP: 'opendatahub.io/connection-test-timestamp',
  MESSAGE: 'opendatahub.io/connection-test-message',
} as const;

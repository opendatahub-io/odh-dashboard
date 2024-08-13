import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { DashboardLabels, DisplayNameAnnotations } from '~/k8sTypes';

export enum ConnectionTypeFieldType {
  Boolean = 'boolean',
  Dropdown = 'dropdown',
  File = 'file',
  Hidden = 'hidden',
  Numeric = 'numeric',
  Section = 'section',
  ShortText = 'short-text',
  Text = 'text',
  URI = 'uri',
}

// exclude 'section'
export const connectionTypeDataFields = [
  ConnectionTypeFieldType.Boolean,
  ConnectionTypeFieldType.Dropdown,
  ConnectionTypeFieldType.File,
  ConnectionTypeFieldType.Hidden,
  ConnectionTypeFieldType.Numeric,
  ConnectionTypeFieldType.ShortText,
  ConnectionTypeFieldType.Text,
  ConnectionTypeFieldType.URI,
];

type Field<T extends ConnectionTypeFieldType | string> = {
  type: T;
  name: string;
  description?: string;
};

export type ConnectionTypeCommonProperties<V = string> = {
  defaultValue?: V;
  defaultReadOnly?: boolean;
};

// P default to an empty set of properties
// eslint-disable-next-line @typescript-eslint/ban-types
export type DataField<T extends ConnectionTypeFieldType | string, V = string, P = {}> = Field<T> & {
  envVar: string;
  required?: boolean;
  properties: P & ConnectionTypeCommonProperties<V>;
};

export type SectionField = Field<ConnectionTypeFieldType.Section | 'section'>;

export type HiddenField = DataField<ConnectionTypeFieldType.Hidden | 'hidden'>;
export type FileField = DataField<ConnectionTypeFieldType.File | 'file'>;
export type ShortTextField = DataField<ConnectionTypeFieldType.ShortText | 'short-text'>;
export type TextField = DataField<ConnectionTypeFieldType.Text | 'text'>;
export type UriField = DataField<ConnectionTypeFieldType.URI | 'uri'>;
export type BooleanField = DataField<
  ConnectionTypeFieldType.Boolean | 'boolean',
  boolean,
  {
    label?: string;
  }
>;
export type DropdownField = DataField<
  ConnectionTypeFieldType.Dropdown | 'dropdown',
  string[],
  {
    variant?: 'single' | 'multi';
    items?: { label: string; value: string }[];
  }
>;
export type NumericField = DataField<ConnectionTypeFieldType.Numeric | 'numeric', number>;

export type ConnectionTypeField =
  | BooleanField
  | DropdownField
  | FileField
  | HiddenField
  | NumericField
  | TextField
  | SectionField
  | ShortTextField
  | UriField;

export type ConnectionTypeDataField = Exclude<ConnectionTypeField, SectionField>;

export type ConnectionTypeConfigMap = K8sResourceCommon & {
  metadata: {
    name: string;
    annotations?: DisplayNameAnnotations & {
      'opendatahub.io/enabled'?: 'true' | 'false';
      'opendatahub.io/username'?: string;
    };
    labels: DashboardLabels & {
      'opendatahub.io/connection-type': 'true';
    };
  };
  data?: {
    // JSON of type ConnectionTypeField
    fields?: string;
  };
};

export type ConnectionTypeConfigMapObj = Omit<ConnectionTypeConfigMap, 'data'> & {
  data?: {
    fields?: ConnectionTypeField[];
  };
};

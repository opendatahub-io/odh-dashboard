import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { DashboardLabels, DisplayNameAnnotations, SecretKind } from '#~/k8sTypes';

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

export type ConnectionTypeDataFieldTypeUnion =
  | 'boolean'
  | 'dropdown'
  | 'file'
  | 'hidden'
  | 'numeric'
  | 'short-text'
  | 'text'
  | 'uri';

export type ConnectionTypeFieldTypeUnion =
  | ConnectionTypeFieldType
  | 'boolean'
  | 'dropdown'
  | 'file'
  | 'hidden'
  | 'numeric'
  | 'section'
  | 'short-text'
  | 'text'
  | 'uri';

type Field<T extends ConnectionTypeFieldTypeUnion> = {
  type: T;
  name: string;
  description?: string;
};

export type ConnectionTypeCommonProperties<V = string> = {
  defaultValue?: V;
  defaultReadOnly?: boolean;
  deferInput?: boolean;
};

// P default to an empty set of properties
// eslint-disable-next-line @typescript-eslint/ban-types
export type DataField<T extends ConnectionTypeFieldTypeUnion, V = string, P = {}> = Field<T> & {
  envVar: string;
  required?: boolean;
  properties: P & ConnectionTypeCommonProperties<V>;
};

export type SectionField = Field<ConnectionTypeFieldType.Section | 'section'>;

export type HiddenField = DataField<ConnectionTypeFieldType.Hidden | 'hidden'>;
export type ShortTextField = DataField<ConnectionTypeFieldType.ShortText | 'short-text'>;
export type TextField = DataField<ConnectionTypeFieldType.Text | 'text'>;
export type UriField = DataField<ConnectionTypeFieldType.URI | 'uri'>;
export type FileField = DataField<
  ConnectionTypeFieldType.File | 'file',
  string,
  {
    extensions?: string[];
    helperText?: string; // No UI to add this field, must do in yaml
  }
>;
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
export type NumericField = DataField<
  ConnectionTypeFieldType.Numeric | 'numeric',
  number,
  {
    unit?: string;
    min?: number;
    max?: number;
  }
>;

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
      'opendatahub.io/disabled'?: 'true' | 'false';
      'opendatahub.io/username'?: string;
    };
    labels: DashboardLabels & {
      'opendatahub.io/connection-type': 'true';
    };
  };
  data?: {
    category?: string;
    // JSON of type ConnectionTypeField
    fields?: string;
  };
};

export type ConnectionTypeConfigMapObj = Omit<ConnectionTypeConfigMap, 'data'> & {
  data?: {
    category?: string[];
    fields?: ConnectionTypeField[];
  };
};

export type ConnectionTypeValueType = ConnectionTypeDataField['properties']['defaultValue'];

export type Connection = SecretKind & {
  metadata: {
    labels: DashboardLabels & {
      'opendatahub.io/managed'?: 'true';
    };
    annotations: DisplayNameAnnotations & {
      'opendatahub.io/connection-type'?: 's3' | string;
      'opendatahub.io/connection-type-ref'?: string;
    };
  };
  data?: {
    [key: string]: string;
  };
};

export type ConnectionTypeFormData = {
  enabled: boolean;
  fields: ConnectionTypeField[];
  username: string;
  category: string[];
};

import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { DashboardLabels, DisplayNameAnnotations } from '~/k8sTypes';

export enum ConnectionTypeFieldType {
  Boolean = 'boolean',
  Dropdown = 'dropdown',
  File = 'file',
  Hidden = 'hidden',
  Numeric = 'numeric',
  Paragraph = 'paragraph',
  Section = 'section',
  ShortText = 'short-text',
  URI = 'uri',
}

// exclude 'section'
export const connectionTypeDataFields = [
  ConnectionTypeFieldType.Boolean,
  ConnectionTypeFieldType.Dropdown,
  ConnectionTypeFieldType.File,
  ConnectionTypeFieldType.Hidden,
  ConnectionTypeFieldType.Numeric,
  ConnectionTypeFieldType.Paragraph,
  ConnectionTypeFieldType.ShortText,
  ConnectionTypeFieldType.URI,
];

type Field<T extends ConnectionTypeFieldType | string> = {
  type: T;
  name: string;
  description?: string;
};

type DataField<T extends ConnectionTypeFieldType | string, P> = Field<T> & {
  envVar: string;
  required?: boolean;
  properties: P;
};

type TextProps = {
  defaultValue?: string;
  defaultReadOnly?: boolean;
};

export type SectionField = Field<ConnectionTypeFieldType.Section | 'section'>;

export type HiddenField = DataField<ConnectionTypeFieldType.Hidden | 'hidden', TextProps>;
export type ParagraphField = DataField<ConnectionTypeFieldType.Paragraph | 'paragraph', TextProps>;
export type FileField = DataField<ConnectionTypeFieldType.File | 'file', TextProps>;
export type ShortTextField = DataField<ConnectionTypeFieldType.ShortText | 'short-text', TextProps>;
export type UriField = DataField<ConnectionTypeFieldType.URI | 'uri', TextProps>;
export type BooleanField = DataField<
  ConnectionTypeFieldType.Boolean | 'boolean',
  {
    label?: string;
    defaultValue?: boolean;
    defaultReadOnly?: boolean;
  }
>;
export type DropdownField = DataField<
  ConnectionTypeFieldType.Dropdown | 'dropdown',
  {
    variant: 'single' | 'multi';
    items: { label: string; value: string }[];
    defaultValue?: string[];
  }
>;
export type NumericField = DataField<
  ConnectionTypeFieldType.Numeric | 'numeric',
  {
    defaultValue?: number;
    defaultReadOnly?: boolean;
  }
>;

export type ConnectionTypeField =
  | BooleanField
  | DropdownField
  | FileField
  | HiddenField
  | NumericField
  | ParagraphField
  | SectionField
  | ShortTextField
  | UriField;

export type ConnectionTypeConfigMap = K8sResourceCommon & {
  metadata: {
    name: string;
    annotations: DisplayNameAnnotations & {
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

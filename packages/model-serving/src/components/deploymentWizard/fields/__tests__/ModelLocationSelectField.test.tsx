import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { z } from 'zod';
import { useWizardContext, useWizardFooter } from '@patternfly/react-core';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  ModelLocationData as ModelLocationDataField,
  ModelLocationType,
} from '../modelLocationFields/types';
import { isValidModelLocationData, useModelLocationData } from '../ModelLocationInputFields';
import { ModelLocationSelectField } from '../ModelLocationSelectField';

const modelLocationSchema = z.object({
  modelLocationData: z.custom<ModelLocationDataField>((val) => {
    if (!val) return false;
    return isValidModelLocationData(val.type, val);
  }),
});

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  useWizardContext: jest.fn(),
  useWizardFooter: jest.fn(),
}));
const mockUseWizardContext = useWizardContext as jest.MockedFunction<typeof useWizardContext>;
const mockUseWizardFooter = useWizardFooter as jest.MockedFunction<typeof useWizardFooter>;
const mockConnectionTypes: ConnectionTypeConfigMapObj[] = [
  {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'uri-v1',
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        'opendatahub.io/connection-type': 'true',
      },
      annotations: {
        'openshift.io/display-name': 'URI - v1',
      },
    },
    data: {
      fields: [
        {
          envVar: 'URI',
          name: 'URI',
          required: true,
          type: 'uri',
          properties: {},
        },
      ],
    },
  },
  {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 's3',
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        'opendatahub.io/connection-type': 'true',
      },
    },
    data: {
      fields: [
        {
          envVar: 'AWS_ACCESS_KEY_ID',
          name: 'AWS_ACCESS_KEY_ID',
          required: true,
          type: 'short-text',
          properties: {},
        },
        {
          envVar: 'AWS_SECRET_ACCESS_KEY',
          name: 'AWS_SECRET_ACCESS_KEY',
          required: true,
          type: 'hidden',
          properties: {},
        },
        {
          envVar: 'AWS_S3_ENDPOINT',
          name: 'AWS_S3_ENDPOINT',
          required: true,
          type: 'short-text',
          properties: {},
        },
        {
          envVar: 'AWS_S3_BUCKET',
          name: 'AWS_S3_BUCKET',
          required: true,
          type: 'short-text',
          properties: {},
        },
        {
          envVar: 'AWS_DEFAULT_REGION',
          name: 'AWS_DEFAULT_REGION',
          required: false,
          type: 'short-text',
          properties: {},
        },
      ],
    },
  },
  {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'oci',
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        'opendatahub.io/connection-type': 'true',
      },
    },
    data: {
      fields: [
        {
          envVar: 'ACCESS_TYPE',
          name: 'ACCESS_TYPE',
          required: false,
          type: 'dropdown',
          properties: {},
        },
        {
          envVar: '.dockerconfigjson',
          name: '.dockerconfigjson',
          required: true,
          type: 'file',
          properties: {},
        },
        {
          envVar: 'OCI_HOST',
          name: 'OCI_HOST',
          required: true,
          type: 'short-text',
          properties: {},
        },
      ],
    },
  },
];
jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: () => [mockConnectionTypes],
}));
describe('ModelLocationSelectField', () => {
  const mockWizardContext = {
    activeStep: { index: 1, name: 'test-step', id: 'test-step', parentId: undefined },
    goToNextStep: jest.fn(),
    goToPrevStep: jest.fn(),
    close: jest.fn(),
    steps: [],
    footer: <div>Mock Footer</div>,
    goToStepById: jest.fn(),
    goToStepByName: jest.fn(),
    goToStepByIndex: jest.fn(),
    setFooter: jest.fn(),
    getStep: jest.fn(),
    setStep: jest.fn(),
    currentStepIndex: 1,
    hasBodyPadding: true,
    shouldFocusContent: true,
    mainWrapperRef: { current: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWizardContext.mockReturnValue(mockWizardContext);
    mockUseWizardFooter.mockImplementation(() => undefined);
  });
  describe('Schema validation', () => {
    it('should validate new S3 connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: {
          type: ModelLocationType.NEW,
          connection: 'S3-connection',
          fieldValues: {
            AWS_S3_BUCKET: 'bucket',
            AWS_S3_ENDPOINT: 'endpoint',
            AWS_S3_REGION: 'region',
            AWS_S3_ACCESS_KEY_ID: 'key',
            AWS_S3_SECRET_ACCESS_KEY: 'secret',
          },
          additionalFields: {
            modelPath: 'path',
          },
        },
      });
      expect(result.success).toBe(true);
    });
    it('should validate new OCI connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: {
          type: ModelLocationType.NEW,
          connection: 'OCI-connection',
          fieldValues: {
            OCI_HOST: 'host',
            '.dockerconfigjson': 'secret',
            ACCESS_TYPE: ['Pull'],
          },
          additionalFields: {
            modelUri: 'oci://test',
          },
        },
      });
      expect(result.success).toBe(true);
    });
    it('should validate new URI connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: { type: ModelLocationType.NEW, fieldValues: { URI: 'uri://test' } },
      });
      expect(result.success).toBe(true);
    });
    it('should validate new PVC connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: {
          type: ModelLocationType.PVC,
          fieldValues: { URI: 'pvc://test/path' },
          additionalFields: { pvcConnection: 'test' },
        },
      });
      expect(result.success).toBe(true);
    });
    it('should validate existing uri connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: {
          type: ModelLocationType.EXISTING,
          fieldValues: {},
          connection: 'uri-connection',
          additionalFields: { modelUri: 'uri://test' },
        },
      });
      expect(result.success).toBe(true);
    });
    it('should validate existing s3 connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: {
          type: ModelLocationType.EXISTING,
          fieldValues: {},
          connection: 's3-connection',
          additionalFields: { modelPath: 'path' },
        },
      });
      expect(result.success).toBe(true);
    });
    it('should validate existing oci connection', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: {
          type: ModelLocationType.EXISTING,
          fieldValues: {},
          connection: 'oci-connection',
          additionalFields: { modelUri: 'oci://test' },
        },
      });
      expect(result.success).toBe(true);
    });
    it('should reject invalid values', () => {
      const result = modelLocationSchema.safeParse({
        modelLocationData: { type: 'invalid' },
      });
      expect(result.success).toBe(false);
    });
    it('should show required error for undefined', () => {
      const result = modelLocationSchema.safeParse(undefined);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Required');
      }
    });
  });
  describe('isValidModelLocationData', () => {
    it('should return true for valid model location data', () => {
      expect(
        isValidModelLocationData(ModelLocationType.NEW, {
          type: ModelLocationType.NEW,
          fieldValues: {
            URI: 'uri://test',
          },
          additionalFields: {},
        }),
      ).toBe(true);
    });
    it('should return false for invalid model location data', () => {
      expect(
        isValidModelLocationData(ModelLocationType.NEW, {
          type: ModelLocationType.EXISTING,
          fieldValues: {},
          additionalFields: {},
        }),
      ).toBe(false);
    });
  });
  describe('useModelLocationData hook', () => {
    it('should initialize with undefined by default', () => {
      const { result } = renderHook(() => useModelLocationData(null));
      expect(result.current.data).toBeUndefined();
    });
    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useModelLocationData(null, {
          type: ModelLocationType.NEW,
          fieldValues: { URI: 'uri://test' },
          additionalFields: {},
        }),
      );
      expect(result.current.data).toEqual({
        type: ModelLocationType.NEW,
        fieldValues: { URI: 'uri://test' },
        additionalFields: {},
      });
    });
    it('should update model location data', () => {
      const { result } = renderHook(() => useModelLocationData(null));
      act(() => {
        result.current.setData({
          type: ModelLocationType.NEW,
          fieldValues: { URI: 'uri://test' },
          additionalFields: {},
        });
      });
      expect(result.current.data).toEqual({
        type: ModelLocationType.NEW,
        fieldValues: { URI: 'uri://test' },
        additionalFields: {},
      });
    });
  });
  describe('Component', () => {
    const mockSetModelLocationData = jest.fn();
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should render with default props', () => {
      render(
        <ModelLocationSelectField
          setModelLocationData={mockSetModelLocationData}
          connections={[]}
          project={null}
          resetModelLocationData={jest.fn()}
          selectedConnection={undefined}
          setSelectedConnection={jest.fn()}
        />,
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByTestId('model-location-select')).toBeInTheDocument();
    });
    it('should render with selected value', () => {
      render(
        <ModelLocationSelectField
          modelLocation={ModelLocationType.NEW}
          setModelLocationData={mockSetModelLocationData}
          connections={[]}
          project={null}
          resetModelLocationData={jest.fn()}
          selectedConnection={undefined}
          setSelectedConnection={jest.fn()}
          modelLocationData={{
            type: ModelLocationType.NEW,
            fieldValues: { URI: 'uri://test' },
            additionalFields: {},
            connectionTypeObject: {
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: {
                name: 'uri-v1',
                labels: {
                  [KnownLabels.DASHBOARD_RESOURCE]: 'true',
                  'opendatahub.io/connection-type': 'true',
                },
              },
            },
          }}
        />,
      );
      expect(screen.getByTestId('model-location-select')).toBeInTheDocument();
      expect(screen.getByTestId('field URI')).toHaveValue('uri://test');
    });
    it('should call setModelLocationData on valid location type selection', async () => {
      render(
        <ModelLocationSelectField
          setModelLocationData={mockSetModelLocationData}
          connections={[]}
          project={null}
          resetModelLocationData={jest.fn()}
          selectedConnection={undefined}
          setSelectedConnection={jest.fn()}
          modelLocationData={{
            type: ModelLocationType.NEW,
            fieldValues: { URI: 'https://test' },
            additionalFields: {},
            connectionTypeObject: {
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: {
                name: 'uri-v1',
                labels: {
                  [KnownLabels.DASHBOARD_RESOURCE]: 'true',
                  'opendatahub.io/connection-type': 'true',
                },
              },
            },
          }}
        />,
      );
      const button = screen.getByTestId('model-location-select');
      await act(async () => {
        fireEvent.click(button);
      });
      const option = screen.getByText('URI - v1');
      await act(async () => {
        fireEvent.click(option);
      });
      expect(mockSetModelLocationData).toHaveBeenCalledWith({
        type: ModelLocationType.NEW,
        connectionTypeObject: mockConnectionTypes[0],
        fieldValues: {},
        additionalFields: {},
      });
    });
    it('should call setModelLocationData on valid URI location input', async () => {
      render(
        <ModelLocationSelectField
          modelLocation={ModelLocationType.NEW}
          setModelLocationData={mockSetModelLocationData}
          connections={[]}
          project={null}
          resetModelLocationData={jest.fn()}
          selectedConnection={undefined}
          setSelectedConnection={jest.fn()}
          modelLocationData={{
            type: ModelLocationType.NEW,
            fieldValues: { URI: 'https://test' },
            additionalFields: {},
            connectionTypeObject: mockConnectionTypes[0],
          }}
        />,
      );
      const uriInput = screen.getByTestId('field URI');
      expect(uriInput).toHaveValue('https://test');

      await act(async () => {
        fireEvent.change(uriInput, { target: { value: 'https://newtest' } });
      });

      expect(mockSetModelLocationData).toHaveBeenCalledWith({
        type: ModelLocationType.NEW,
        connectionTypeObject: mockConnectionTypes[0],
        fieldValues: { URI: 'https://newtest' },
        additionalFields: {},
      });
    });
    it('should call setModelLocationData on valid S3 location input', async () => {
      render(
        <ModelLocationSelectField
          modelLocation={ModelLocationType.NEW}
          setModelLocationData={mockSetModelLocationData}
          connections={[]}
          project={null}
          resetModelLocationData={jest.fn()}
          selectedConnection={undefined}
          setSelectedConnection={jest.fn()}
          modelLocationData={{
            type: ModelLocationType.NEW,
            fieldValues: {
              AWS_S3_BUCKET: 'bucket',
              AWS_S3_ENDPOINT: 'endpoint',
              AWS_S3_REGION: 'region',
              AWS_S3_ACCESS_KEY_ID: 'key',
              AWS_S3_SECRET_ACCESS_KEY: 'secret',
            },
            additionalFields: { modelPath: 'path' },
            connectionTypeObject: mockConnectionTypes[1],
          }}
        />,
      );
      const s3Input = screen.getByTestId('field AWS_S3_BUCKET');
      expect(s3Input).toHaveValue('bucket');

      await act(async () => {
        fireEvent.change(s3Input, { target: { value: 'newbucket' } });
      });
      expect(mockSetModelLocationData).toHaveBeenCalledWith({
        type: ModelLocationType.NEW,
        connectionTypeObject: mockConnectionTypes[1],
        fieldValues: {
          AWS_S3_BUCKET: 'newbucket',
          AWS_S3_ENDPOINT: 'endpoint',
          AWS_S3_REGION: 'region',
          AWS_S3_ACCESS_KEY_ID: 'key',
          AWS_S3_SECRET_ACCESS_KEY: 'secret',
        },
        additionalFields: { modelPath: 'path' },
      });
    });
    it('should call setModelLocationData on valid OCI location input', async () => {
      render(
        <ModelLocationSelectField
          modelLocation={ModelLocationType.NEW}
          setModelLocationData={mockSetModelLocationData}
          connections={[]}
          project={null}
          resetModelLocationData={jest.fn()}
          selectedConnection={undefined}
          setSelectedConnection={jest.fn()}
          modelLocationData={{
            type: ModelLocationType.NEW,
            fieldValues: {
              OCI_HOST: 'host',
              '.dockerconfigjson': 'secret',
              ACCESS_TYPE: ['Pull'],
            },
            additionalFields: { modelUri: 'oci://test' },
            connectionTypeObject: mockConnectionTypes[2],
          }}
        />,
      );
      const ociInput = screen.getByTestId('field OCI_HOST');
      expect(ociInput).toHaveValue('host');

      await act(async () => {
        fireEvent.change(ociInput, { target: { value: 'newhost' } });
      });
      expect(mockSetModelLocationData).toHaveBeenCalledWith({
        type: ModelLocationType.NEW,
        connectionTypeObject: mockConnectionTypes[2],
        fieldValues: { OCI_HOST: 'newhost', '.dockerconfigjson': 'secret', ACCESS_TYPE: ['Pull'] },
        additionalFields: { modelUri: 'oci://test' },
      });
    });
  });
});

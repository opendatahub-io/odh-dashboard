/* eslint-disable camelcase */
import { ModelRegistryMetadataType, RegisteredModelList } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from './mockRegisteredModel';

export const mockRegisteredModelList = ({
  size = 5,
}: Partial<RegisteredModelList>): RegisteredModelList => ({
  items: [
    mockRegisteredModel({ name: 'test-1' }),
    mockRegisteredModel({ name: 'test-2' }),
    mockRegisteredModel({
      name: 'Fraud detection model',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      customProperties: {
        Financial: {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: 'non-empty',
        },
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Fraud detection': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Machine learning': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
    mockRegisteredModel({
      name: 'Credit Scoring',
      customProperties: {
        'Credit Score Predictor': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Creditworthiness scoring system': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Default Risk Analyzer': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Portfolio Management': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Risk Assessment': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
    mockRegisteredModel({
      name: 'Label modal',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      customProperties: {
        'Testing label': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        Financial: {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: 'non-empty',
        },
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Fraud detection': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
          {
            metadataType: ModelRegistryMetadataType.STRING,
            string_value: '',
          },
        'Machine learning': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Label x': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Label y': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Label z': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
  ],
  nextPageToken: '',
  pageSize: 0,
  size,
});

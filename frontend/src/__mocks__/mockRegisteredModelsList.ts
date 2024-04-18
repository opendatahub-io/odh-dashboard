/* eslint-disable camelcase */
import { RegisteredModelList } from '~/concepts/modelRegistry/types';
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
          metadataType: 'MetadataStringValue',
          string_value: 'non-empty',
        },
        'Financial data': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Fraud detection': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Test label': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Machine learning': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
      },
    }),
    mockRegisteredModel({
      name: 'Credit Scoring',
      customProperties: {
        'Credit Score Predictor': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Creditworthiness scoring system': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Default Risk Analyzer': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Portfolio Management': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Risk Assessment': {
          metadataType: 'MetadataStringValue',
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
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        Financial: {
          metadataType: 'MetadataStringValue',
          string_value: 'non-empty',
        },
        'Financial data': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Fraud detection': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
          {
            metadataType: 'MetadataStringValue',
            string_value: '',
          },
        'Machine learning': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Label x': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Label y': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Label z': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
      },
    }),
  ],
  nextPageToken: '',
  pageSize: 0,
  size,
});

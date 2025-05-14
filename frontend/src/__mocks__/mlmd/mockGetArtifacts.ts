/* eslint-disable camelcase */
import { GetArtifactsResponse, GetArtifactsByIDResponse } from '~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

export const mockedArtifactsResponse: GetArtifactsResponse = {
  artifacts: [
    {
      id: 1,
      typeId: 14,
      type: 'system.Metrics',
      uri: 's3://scalar-metrics-uri-scalar-metrics-uri',
      properties: {},
      customProperties: {
        accuracy: { doubleValue: 92 },
        display_name: { stringValue: 'scalar metrics' },
      },
      state: 2,
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
    {
      id: 2,
      typeId: 16,
      type: 'system.Dataset',
      uri: 's3://dataset-uri',
      properties: {},
      customProperties: { display_name: { stringValue: 'dataset' } },
      state: 2,
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
    {
      id: 3,
      typeId: 15,
      type: 'system.ClassificationMetrics',
      uri: 's3://confidence-metrics-uri',
      properties: {},
      customProperties: {
        confidenceMetrics: {
          structValue: {
            fields: {
              list: {
                nullValue: 0,
                numberValue: 0,
                stringValue: '',
                boolValue: false,
                listValue: {
                  valuesList: [
                    {
                      nullValue: 0,
                      numberValue: 0,
                      stringValue: '',
                      boolValue: false,
                      structValue: {
                        fields: {
                          confidenceThreshold: {
                            nullValue: 0,
                            numberValue: 2,
                            stringValue: '',
                            boolValue: false,
                          },

                          falsePositiveRate: {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                          },

                          recall: {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                          },
                        },
                      },
                    },
                    {
                      nullValue: 0,
                      numberValue: 0,
                      stringValue: '',
                      boolValue: false,
                      structValue: {
                        fields: {
                          confidenceThreshold: {
                            nullValue: 0,
                            numberValue: 1,
                            stringValue: '',
                            boolValue: false,
                          },

                          falsePositiveRate: {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                          },

                          recall: {
                            nullValue: 0,
                            numberValue: 0.33962264150943394,
                            stringValue: '',
                            boolValue: false,
                          },
                        },
                      },
                    },
                    {
                      nullValue: 0,
                      numberValue: 0,
                      stringValue: '',
                      boolValue: false,
                      structValue: {
                        fields: {
                          confidenceThreshold: {
                            nullValue: 0,
                            numberValue: 0.9,
                            stringValue: '',
                            boolValue: false,
                          },
                          falsePositiveRate: {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                          },
                          recall: {
                            nullValue: 0,
                            numberValue: 0.6037735849056604,
                            stringValue: '',
                            boolValue: false,
                          },
                        },
                      },
                    },
                    {
                      nullValue: 0,
                      numberValue: 0,
                      stringValue: '',
                      boolValue: false,
                      structValue: {
                        fields: {
                          confidenceThreshold: {
                            nullValue: 0,
                            numberValue: 0.8,
                            stringValue: '',
                            boolValue: false,
                          },
                          falsePositiveRate: {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                          },
                          recall: {
                            nullValue: 0,
                            numberValue: 0.8490566037735849,
                            stringValue: '',
                            boolValue: false,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        display_name: { stringValue: 'confidence metrics' },
      },
      state: 2,
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
    {
      id: 4,
      typeId: 15,
      type: 'system.ClassificationMetrics',
      uri: 's3://confusion-matrix-uri',
      properties: {},
      customProperties: {
        confusionMatrix: {
          structValue: {
            fields: {
              struct: {
                nullValue: 0,
                numberValue: 0,
                stringValue: '',
                boolValue: false,
                structValue: {
                  fields: {
                    annotationSpecs: {
                      nullValue: 0,
                      numberValue: 0,
                      stringValue: '',
                      boolValue: false,
                      listValue: {
                        valuesList: [
                          {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                            structValue: {
                              fields: {
                                displayName: {
                                  nullValue: 0,
                                  numberValue: 0,
                                  stringValue: 'Setosa',
                                  boolValue: false,
                                },
                              },
                            },
                          },
                          {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                            structValue: {
                              fields: {
                                displayName: {
                                  nullValue: 0,
                                  numberValue: 0,
                                  stringValue: 'Versicolour',
                                  boolValue: false,
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                    rows: {
                      nullValue: 0,
                      numberValue: 0,
                      stringValue: '',
                      boolValue: false,
                      listValue: {
                        valuesList: [
                          {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                            structValue: {
                              fields: {
                                row: {
                                  nullValue: 0,
                                  numberValue: 0,
                                  stringValue: '',
                                  boolValue: false,
                                  listValue: {
                                    valuesList: [
                                      {
                                        nullValue: 0,
                                        numberValue: 37,
                                        stringValue: '',
                                        boolValue: false,
                                      },
                                      {
                                        nullValue: 0,
                                        numberValue: 0,
                                        stringValue: '',
                                        boolValue: false,
                                      },
                                      {
                                        nullValue: 0,
                                        numberValue: 0,
                                        stringValue: '',
                                        boolValue: false,
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          },
                          {
                            nullValue: 0,
                            numberValue: 0,
                            stringValue: '',
                            boolValue: false,
                            structValue: {
                              fields: {
                                row: {
                                  nullValue: 0,
                                  numberValue: 0,
                                  stringValue: '',
                                  boolValue: false,
                                  listValue: {
                                    valuesList: [
                                      {
                                        nullValue: 0,
                                        numberValue: 15,
                                        stringValue: '',
                                        boolValue: false,
                                      },
                                      {
                                        nullValue: 0,
                                        numberValue: 7,
                                        stringValue: '',
                                        boolValue: false,
                                      },
                                      {
                                        nullValue: 0,
                                        numberValue: 11,
                                        stringValue: '',
                                        boolValue: false,
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        display_name: { stringValue: 'confusion matrix' },
      },
      state: 2,
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
    {
      id: 6,
      typeId: 18,
      type: 'system.HTML',
      uri: 's3://html-metrics-uri',
      properties: {},
      customProperties: {
        display_name: { stringValue: 'html metrics' },
      },
      state: 2,
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
    {
      id: 7,
      typeId: 14,
      type: 'system.Metrics',
      uri: 's3://scalar-metrics-uri-scalar-metrics-uri',
      properties: {},
      customProperties: {},
      state: 2,
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
    {
      id: 8,
      typeId: 15,
      type: 'system.ClassificationMetrics',
      uri: 's3://scalar-metrics-uri-scalar-metrics-uri',
      customProperties: {
        display_name: { stringValue: 'registered model metrics' },
        registeredModelName: { stringValue: 'model' },
        registeredModelId: { stringValue: '1' },
        modelVersionName: { stringValue: '1' },
        modelVersionId: { stringValue: '1' },
        modelRegistryName: { stringValue: 'model-registry' },
      },
      state: 2,
      properties: {},
      createTimeSinceEpoch: 1611399342384,
      lastUpdateTimeSinceEpoch: 1611399342384,
    },
  ],
};

export const mockGetArtifactsById = (response: GetArtifactsByIDResponse): GrpcResponse => {
  const binary = GetArtifactsByIDResponse.encode(response).finish();
  return createGrpcResponse(binary);
};

export const mockGetArtifactsResponse = (response: GetArtifactsResponse): GrpcResponse => {
  const binary = GetArtifactsResponse.encode(response).finish();
  return createGrpcResponse(binary);
};

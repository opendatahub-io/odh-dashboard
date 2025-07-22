/* eslint-disable camelcase */

import { DataSource, DataSources } from '#~/pages/featureStore/types';

/* eslint-disable @typescript-eslint/naming-convention */
export const mockDataSource_REQUEST_SOURCE = (partial?: Partial<DataSource>): DataSource => ({
  type: 'REQUEST_SOURCE',
  requestDataOptions: {
    schema: [
      {
        name: 'loan_amnt',
        valueType: 'INT64',
        tags: {
          request_time: 'true',
          type: 'numerical',
          pii: 'false',
          core_feature: 'true',
          currency: 'USD',
        },
      },
      {
        name: 'person_income',
        valueType: 'INT64',
        tags: {
          verification: 'required',
          request_time: 'true',
          type: 'numerical',
          pii: 'true',
          currency: 'USD',
        },
      },
      {
        name: 'application_channel',
        valueType: 'STRING',
        tags: {
          contextual: 'true',
          fraud_indicator: 'true',
          type: 'categorical',
          channel: 'true',
          pii: 'false',
        },
      },
      {
        name: 'time_of_day',
        valueType: 'INT64',
        tags: {
          temporal: 'true',
          fraud_indicator: 'true',
          behavioral: 'true',
          pii: 'false',
          type: 'numerical',
        },
      },
    ],
  },
  name: 'advanced_application_data',
  ...partial,
});

/* eslint-disable @typescript-eslint/naming-convention */
export const mockDataSource_BATCH_FILE = (partial?: Partial<DataSource>): DataSource => ({
  type: 'BATCH_FILE',
  timestampField: 'event_timestamp',
  createdTimestampColumn: 'created_timestamp',
  fileOptions: {
    fileFormat: {
      parquetFormat: {},
    },
    uri: 'data/loan_table.parquet',
  },
  name: 'Loan table',
  description: 'Loan application data including personal and loan characteristics',
  tags: {
    latency: 'low',
    internal: 'true',
    quality: 'high',
    update_frequency: 'real_time',
    business_critical: 'true',
    source_system: 'loan_origination',
    data_type: 'operational',
  },
  ...partial,
});

export const mockEntities = ({
  data_sources = [mockDataSource_REQUEST_SOURCE({}), mockDataSource_BATCH_FILE({})],
}: Partial<DataSources>): DataSources => ({
  data_sources,
});

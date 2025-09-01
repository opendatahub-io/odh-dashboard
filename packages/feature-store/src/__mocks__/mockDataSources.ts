/* eslint-disable camelcase */
import { DataSource, DataSourceList } from '../types/dataSources';

export const mockDataSource = (partial?: Partial<DataSource>): DataSource => ({
  type: 'BATCH_FILE',
  name: 'loan_data',
  description: 'Loan application data',
  owner: 'risk-team@company.com',
  meta: {
    createdTimestamp: '2025-01-15T10:30:00.000000Z',
    lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
  },
  project: 'credit_scoring_local',
  featureDefinition: `from feast import FileSource\n\nloan_data = FileSource(\n    name="loan_data",\n    path="data/loan_table.parquet",\n    timestamp_field="event_timestamp",\n    created_timestamp_column="created_timestamp",\n)`,
  ...partial,
});

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
  meta: {
    createdTimestamp: '2025-01-15T10:30:00.000000Z',
    lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
  },
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
  meta: {
    createdTimestamp: '2025-01-15T10:30:00.000000Z',
    lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
  },
  ...partial,
});

export const mockEntities = ({
  dataSources = [mockDataSource_REQUEST_SOURCE({}), mockDataSource_BATCH_FILE({})],
}: Partial<DataSourceList>): DataSourceList => ({
  dataSources,
  pagination: {
    page: 1,
    limit: 50,
    total_count: dataSources.length,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  },
  relationships: {},
});

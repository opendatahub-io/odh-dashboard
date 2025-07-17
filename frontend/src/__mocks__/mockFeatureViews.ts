/* eslint-disable camelcase */
import { FeatureView } from '#~/concepts/featureStore/types.ts';

export const mockFeatureView = (partial?: Partial<FeatureView>): FeatureView => ({
  featureView: {
    spec: {
      name: 'zipcode_features',
      entities: ['zipcode'],
      features: [
        {
          name: 'city',
          valueType: 'STRING',
          tags: {
            type: 'categorical',
            pii: 'false',
            enrichment: 'location',
            geographic: 'true',
          },
          description: 'City name for the ZIP code',
        },
        {
          name: 'state',
          valueType: 'STRING',
          tags: {
            standardized: 'true',
            type: 'categorical',
            pii: 'false',
            geographic: 'true',
          },
          description: 'State abbreviation for the ZIP code',
        },
        {
          name: 'location_type',
          valueType: 'STRING',
          tags: {
            type: 'categorical',
            segmentation: 'true',
            risk_factor: 'geographic',
            pii: 'false',
          },
          description: 'Type of location (urban, suburban, rural)',
        },
        {
          name: 'tax_returns_filed',
          valueType: 'INT64',
          tags: {
            type: 'numerical',
            economic_indicator: 'true',
            aggregated: 'true',
            pii: 'false',
          },
          description: 'Number of tax returns filed in the ZIP code area',
        },
        {
          name: 'population',
          valueType: 'INT64',
          tags: {
            type: 'numerical',
            density_indicator: 'true',
            pii: 'false',
            demographic: 'true',
          },
          description: 'Total population in the ZIP code area',
        },
        {
          name: 'total_wages',
          valueType: 'INT64',
          tags: {
            income_proxy: 'true',
            type: 'numerical',
            economic_indicator: 'true',
            pii: 'false',
          },
          description: 'Total wages earned in the ZIP code area',
        },
      ],
      tags: {
        pii: 'false',
        team: 'risk',
        domain: 'demographics',
        source: 'census',
      },
      ttl: '315360000s',
      batchSource: {
        type: 'BATCH_FILE',
        timestampField: 'event_timestamp',
        createdTimestampColumn: 'created_timestamp',
        fileOptions: {
          fileFormat: {
            parquetFormat: {},
          },
          uri: 'data/zipcode_table.parquet',
        },
        dataSourceClassType: 'feast.infra.offline_stores.file_source.FileSource',
        name: 'Zipcode source',
        description: 'Geographic and demographic data aggregated by ZIP code',
        tags: {
          update_frequency: 'annual',
          public_data: 'true',
          source_system: 'census_bureau',
          quality: 'high',
          data_type: 'reference',
          external: 'true',
        },
      },
      online: true,
      description:
        'Geographic and demographic features aggregated by ZIP code for credit risk assessment',
      owner: 'risk-team@company.com',
      entityColumns: [
        {
          name: 'zipcode',
          valueType: 'INT64',
        },
      ],
    },
    meta: {
      createdTimestamp: '2025-06-30T07:46:22.705846Z',
      lastUpdatedTimestamp: '2025-06-30T07:50:13.105086Z',
      materializationIntervals: [
        {
          startTime: '2015-07-03T07:50:09.291500Z',
          endTime: '2025-06-30T00:00:00Z',
        },
      ],
    },
    ...partial,
  },
});

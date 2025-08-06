/* eslint-disable camelcase */
import { FeatureService } from '#~/pages/featureStore/types/featureServices';

export const mockFeatureService = (partial?: Partial<FeatureService>): FeatureService => ({
  spec: {
    name: 'credit_assessment_v1',
    features: [
      {
        featureViewName: 'credit_history',
        featureColumns: [
          {
            name: 'credit_card_due',
            valueType: 'INT64',
            tags: {
              debt_type: 'revolving',
              type: 'numerical',
              risk_factor: 'high',
              pii: 'true',
              currency: 'USD',
            },
            description: 'Outstanding credit card balance',
          },
          {
            name: 'mortgage_due',
            valueType: 'INT64',
            tags: {
              debt_type: 'secured',
              type: 'numerical',
              risk_factor: 'medium',
              pii: 'true',
              currency: 'USD',
            },
            description: 'Outstanding mortgage balance',
          },
          {
            name: 'student_loan_due',
            valueType: 'INT64',
            tags: {
              debt_type: 'installment',
              type: 'numerical',
              risk_factor: 'medium',
              pii: 'true',
              currency: 'USD',
            },
            description: 'Outstanding student loan balance',
          },
          {
            name: 'vehicle_loan_due',
            valueType: 'INT64',
            tags: {
              debt_type: 'secured',
              type: 'numerical',
              risk_factor: 'medium',
              pii: 'true',
              currency: 'USD',
            },
            description: 'Outstanding vehicle loan balance',
          },
          {
            name: 'hard_pulls',
            valueType: 'INT64',
            tags: {
              type: 'count',
              inquiry_type: 'hard',
              risk_factor: 'high',
              time_sensitive: 'true',
              pii: 'true',
            },
            description: 'Number of hard credit inquiries in recent period',
          },
          {
            name: 'missed_payments_2y',
            valueType: 'INT64',
            tags: {
              payment_behavior: 'negative',
              type: 'count',
              time_window: '2y',
              risk_factor: 'critical',
              pii: 'true',
            },
            description: 'Number of missed payments in the last 2 years',
          },
          {
            name: 'missed_payments_1y',
            valueType: 'INT64',
            tags: {
              payment_behavior: 'negative',
              type: 'count',
              time_window: '1y',
              risk_factor: 'critical',
              pii: 'true',
            },
            description: 'Number of missed payments in the last 1 year',
          },
          {
            name: 'missed_payments_6m',
            valueType: 'INT64',
            tags: {
              payment_behavior: 'negative',
              type: 'count',
              time_window: '6m',
              risk_factor: 'critical',
              pii: 'true',
            },
            description: 'Number of missed payments in the last 6 months',
          },
          {
            name: 'bankruptcies',
            valueType: 'INT64',
            tags: {
              credit_event: 'major',
              legal_status: 'true',
              type: 'count',
              risk_factor: 'critical',
              pii: 'true',
            },
            description: 'Number of bankruptcy filings on record',
          },
        ],
        timestampField: 'created_timestamp',
        createdTimestampColumn: 'created_timestamp',
        batchSource: {
          type: 'BATCH_FILE',
          timestampField: 'event_timestamp',
          createdTimestampColumn: 'created_timestamp',
          fileOptions: {
            fileFormat: {
              parquetFormat: {},
            },
            uri: 'data/credit_history.parquet',
          },
          name: 'Credit history',
          description: 'Historical credit data including payment history and outstanding debts',
          tags: {
            sensitive: 'high',
            quality: 'critical',
            update_frequency: 'daily',
            cost: 'high',
            source_system: 'credit_bureau',
            data_type: 'transactional',
            external: 'true',
          },
        },
      },
      {
        featureViewName: 'person_demographics',
        featureColumns: [
          {
            name: 'person_age',
            valueType: 'INT64',
            tags: {
              type: 'numerical',
              regulatory: 'age_verification',
              risk_factor: 'medium',
              pii: 'true',
              demographic: 'true',
            },
            description: 'Age of the loan applicant',
          },
          {
            name: 'person_income',
            valueType: 'INT64',
            tags: {
              verification: 'required',
              type: 'numerical',
              risk_factor: 'high',
              financial: 'true',
              currency: 'USD',
              pii: 'true',
            },
            description: 'Annual income of the applicant',
          },
          {
            name: 'person_home_ownership',
            valueType: 'STRING',
            tags: {
              type: 'categorical',
              risk_factor: 'medium',
              stability_indicator: 'true',
              pii: 'true',
              asset_type: 'real_estate',
            },
            description: 'Home ownership status (RENT, OWN, MORTGAGE, OTHER)',
          },
          {
            name: 'person_emp_length',
            valueType: 'DOUBLE',
            tags: {
              employment: 'true',
              type: 'numerical',
              risk_factor: 'medium',
              stability_indicator: 'true',
              pii: 'true',
            },
            description: 'Employment length in years',
          },
        ],
        timestampField: 'created_timestamp',
        createdTimestampColumn: 'created_timestamp',
        batchSource: {
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
        },
      },
      {
        featureViewName: 'total_debt_calc',
        featureColumns: [
          {
            name: 'total_debt_due',
            valueType: 'DOUBLE',
          },
        ],
      },
      {
        featureViewName: 'financial_ratios',
        featureColumns: [
          {
            name: 'debt_to_income_ratio',
            valueType: 'DOUBLE',
          },
          {
            name: 'loan_to_income_ratio',
            valueType: 'DOUBLE',
          },
        ],
      },
      {
        featureViewName: 'risk_scores',
        featureColumns: [
          {
            name: 'risk_score',
            valueType: 'DOUBLE',
          },
          {
            name: 'payment_stability_score',
            valueType: 'DOUBLE',
          },
        ],
      },
    ],
    tags: {
      version: 'v1',
      team: 'risk',
      use_case: 'credit_scoring',
      environment: 'production',
      compliance: 'gdpr_compliant',
    },
    description: 'Complete feature set for credit risk assessment and loan approval decisions',
    owner: 'risk-team@company.com',
  },
  meta: {
    createdTimestamp: '2025-06-30T07:46:22.716396Z',
    lastUpdatedTimestamp: '2025-06-30T07:46:22.716396Z',
  },
  ...partial,
});

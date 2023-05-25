/* TODO: Remove this file after we get the real data */

export type MockBiasConfigurationType = {
  id: string;
  name: string;
  metricType: 'SPD' | 'DIR';
  protectedAttribute: string;
  outcomeName: string;
  favorableOutcome: string;
  privilegedAttribute: string;
  unprivilegedAttribute: string;
  thresholdDelta: number;
  batchSize: number;
};

export const mockBiasConfigurations: MockBiasConfigurationType[] = [
  {
    id: '528ed4a3-fca4-4ba1-afce-0e827c2a7736',
    name: 'credit score - high',
    metricType: 'SPD',
    protectedAttribute: 'gender',
    outcomeName: 'credit_score',
    privilegedAttribute: 'male',
    unprivilegedAttribute: 'female',
    favorableOutcome: 'high',
    thresholdDelta: 0.05,
    batchSize: 1000,
  },
  {
    id: '528ed4a3-fca4-4ba1-afce-0e827c2a7748',
    name: 'credit score - low',
    metricType: 'SPD',
    protectedAttribute: 'gender',
    outcomeName: 'credit_score',
    favorableOutcome: 'low',
    privilegedAttribute: 'male',
    unprivilegedAttribute: 'female',
    thresholdDelta: 0.05,
    batchSize: 1000,
  },
  {
    id: '528ed4a3-fca4-4ba1-afce-0e827c2a7759',
    name: 'loan approval - yes',
    metricType: 'DIR',
    protectedAttribute: 'gender',
    outcomeName: 'loan_status',
    favorableOutcome: 'approved',
    privilegedAttribute: 'male',
    unprivilegedAttribute: 'female',
    thresholdDelta: 0.05,
    batchSize: 1000,
  },
  {
    id: '528ed4a3-fca4-4ba1-afce-0e827c2a7766',
    name: 'loan approval - no',
    metricType: 'DIR',
    protectedAttribute: 'gender',
    outcomeName: 'loan_status',
    favorableOutcome: 'denied',
    privilegedAttribute: 'male',
    unprivilegedAttribute: 'female',
    thresholdDelta: 0.05,
    batchSize: 1000,
  },
];

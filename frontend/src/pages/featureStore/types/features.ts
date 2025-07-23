import { BatchSource, NameValueTypePair } from './global';

export type FeatureColumns = NameValueTypePair & {
  tags?: Record<string, string>;
  description?: string;
};

export type Features = {
  featureViewName: string;
  featureColumns: FeatureColumns[];
  timestampField?: string;
  createdTimestampColumn?: string;
  batchSource?: BatchSource;
}[];

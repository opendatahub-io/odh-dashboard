export type FileFormat = {
  parquetFormat?: Record<string, unknown>;
};

export type FileOptions = {
  fileFormat?: FileFormat;
  uri?: string;
};

export type DataSourceMeta = {
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
};

export type DataSource = {
  type: string;
  timestampField?: string;
  createdTimestampColumn?: string;
  fileOptions?: FileOptions;
  name: string;
  description?: string;
  tags?: Record<string, string>;
  owner: string;
  meta: DataSourceMeta;
};

export type DataSourceList = DataSource[];

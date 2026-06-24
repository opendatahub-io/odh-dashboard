import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';

export type LabeledConnection = {
  connection: Connection;
  isRecommended?: boolean;
};

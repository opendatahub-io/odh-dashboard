import { Connection } from '~/concepts/connectionTypes/types';

export type ModelConnection = {
  connection?: Connection;
  uri?: string; // can be used standalone
  path?: string; // in combination with a connection
};

import * as React from 'react';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { fetchConnectionType } from '~/services/connectionTypesService';

export const useConnectionType = (
  name?: string,
): [boolean, Error | undefined, ConnectionTypeConfigMapObj | undefined] => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [connectionType, setConnectionType] = React.useState<ConnectionTypeConfigMapObj>();

  React.useEffect(() => {
    if (name) {
      fetchConnectionType(name)
        .then((res) => {
          setLoaded(true);
          setConnectionType(res);
        })
        .catch((err) => {
          setLoaded(true);
          setError(err);
        });
    }
  }, [name]);

  return [loaded, error, connectionType];
};

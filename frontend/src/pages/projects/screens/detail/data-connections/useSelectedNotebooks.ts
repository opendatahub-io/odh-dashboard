import * as React from 'react';
import { NotebookKind } from '~/k8sTypes';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { DataConnection } from '~/pages/projects/types';
import { getDataConnectionResourceName } from './utils';

const useSelectedNotebooks = (
  existingData?: DataConnection,
): [
  loaded: boolean,
  selections: string[],
  setSelections: (data: string[]) => void,
  allSelections: NotebookKind[],
  connectedNames: string[],
] => {
  const [selectedNotebooks, setSelectedNotebooks] = React.useState<string[]>([]);

  const resourceName = existingData ? getDataConnectionResourceName(existingData) : '';

  const { notebooks: connectedNotebooks, loaded } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_DATA_CONNECTION,
    resourceName,
  );
  const connectedNotebookNames = useDeepCompareMemoize(
    connectedNotebooks.map((notebook) => notebook.metadata.name),
  );
  const { notebooks: nonConnectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.POSSIBLE_DATA_CONNECTION,
    resourceName,
  );

  const allAvailableNotebooks = React.useMemo(
    () => [...connectedNotebooks, ...nonConnectedNotebooks],
    [connectedNotebooks, nonConnectedNotebooks],
  );

  React.useEffect(() => {
    setSelectedNotebooks(connectedNotebookNames);
  }, [connectedNotebookNames]);

  return [
    loaded,
    selectedNotebooks,
    setSelectedNotebooks,
    allAvailableNotebooks,
    connectedNotebookNames,
  ];
};

export default useSelectedNotebooks;

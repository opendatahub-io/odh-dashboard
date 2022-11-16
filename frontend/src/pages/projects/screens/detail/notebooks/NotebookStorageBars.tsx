import * as React from 'react';
import {
  Alert,
  Button,
  List,
  ListItem,
  Spinner,
  Stack,
  StackItem,
  Text,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { NotebookKind } from '../../../../../k8sTypes';
import useNotebookPVCItems from '../../../pvc/useNotebookPVCItems';
import { getPvcDisplayName } from '../../../utils';
import StorageSizeBar from '../../../components/StorageSizeBars';
import { getNotebookPVCMountPathMap } from '../../../notebook/utils';

type NotebookStorageBarsProps = {
  notebook: NotebookKind;
  onAddStorage: (notebook: NotebookKind) => void;
};

const NotebookStorageBars: React.FC<NotebookStorageBarsProps> = ({ notebook, onAddStorage }) => {
  const [pvcs, loaded, loadError] = useNotebookPVCItems(notebook);
  const mountFolderMap = getNotebookPVCMountPathMap(notebook);

  return (
    <Stack>
      <StackItem>
        <strong>Workbench storages</strong>
      </StackItem>
      <StackItem>
        {!loaded ? (
          <Spinner size="md" />
        ) : loadError ? (
          <Alert variant="danger" isInline title="Error loading storages">
            {loadError.message}
          </Alert>
        ) : (
          <List isPlain>
            {pvcs.map((pvc) => (
              <ListItem key={pvc.metadata.name}>
                <Stack>
                  <StackItem>
                    <Text component="small">{getPvcDisplayName(pvc)}</Text>
                  </StackItem>
                  <StackItem>
                    <StorageSizeBar pvc={pvc} />
                  </StackItem>
                  <StackItem>
                    <Text component="small">
                      Mount path:{' '}
                      {mountFolderMap[pvc.metadata.name]
                        ? mountFolderMap[pvc.metadata.name]
                        : 'Unknown'}
                    </Text>
                  </StackItem>
                </Stack>
              </ListItem>
            ))}
            <ListItem>
              <Button
                variant="link"
                isInline
                icon={<PlusCircleIcon />}
                onClick={() => onAddStorage(notebook)}
              >
                Add storage
              </Button>
            </ListItem>
          </List>
        )}
      </StackItem>
    </Stack>
  );
};

export default NotebookStorageBars;

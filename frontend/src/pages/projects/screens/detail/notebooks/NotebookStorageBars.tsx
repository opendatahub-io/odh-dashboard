import * as React from 'react';
import {
  Alert,
  Button,
  List,
  ListItem,
  Spinner,
  Stack,
  StackItem,
  Content,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { NotebookKind } from '~/k8sTypes';
import useNotebookPVCItems from '~/pages/projects/pvc/useNotebookPVCItems';
import StorageSizeBar from '~/pages/projects/components/StorageSizeBars';
import { getNotebookPVCMountPathMap } from '~/pages/projects/notebook/utils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

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
                    <Content component="small">{getDisplayNameFromK8sResource(pvc)}</Content>
                  </StackItem>
                  <StackItem>
                    <StorageSizeBar pvc={pvc} />
                  </StackItem>
                  <StackItem>
                    <Content component="small">
                      Mount path:{' '}
                      {mountFolderMap[pvc.metadata.name]
                        ? mountFolderMap[pvc.metadata.name]
                        : 'Unknown'}
                    </Content>
                  </StackItem>
                </Stack>
              </ListItem>
            ))}
            <ListItem>
              <Button
                data-testid="add-storage-button"
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

import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  List,
  ListItem,
  Progress,
  ProgressMeasureLocation,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { NotebookKind } from '../../../../../k8sTypes';
import useNotebookPVCItems from '../../../pvc/useNotebookPVCItems';
import { getPvcDisplayName } from '../../../utils';

type WorkspaceStorageBarsProps = {
  notebook: NotebookKind;
};

type StorageType = {
  name: string;
  inUseValue: string;
  maxValue: string;
};

const convertToPercentage = (storage: StorageType): number => {
  return (parseFloat(storage.inUseValue) / parseFloat(storage.maxValue)) * 100;
};

const WorkspaceStorageBars: React.FC<WorkspaceStorageBarsProps> = ({ notebook }) => {
  const [pvcs, loaded, loadError] = useNotebookPVCItems(notebook);
  const storages: StorageType[] = pvcs.map((pvc) => ({
    name: getPvcDisplayName(pvc),
    inUseValue: '0Gi', // TODO: Setup prometheus query for info
    maxValue: pvc.status?.capacity?.storage || pvc.spec.resources.requests.storage,
  }));

  return (
    <Stack>
      <StackItem>
        <b>Workspace storages</b>
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
            {storages.map((storage) => (
              <ListItem key={storage.name}>
                <Stack>
                  <StackItem>
                    <Text component="small">{storage.name}</Text>
                  </StackItem>
                  <StackItem>
                    <Split hasGutter>
                      <SplitItem>
                        <Bullseye>
                          <Text component="small">{storage.inUseValue}</Text>
                        </Bullseye>
                      </SplitItem>
                      <SplitItem isFilled style={{ maxWidth: 200 }}>
                        <Progress
                          aria-label={`Storage is ${convertToPercentage(storage)} full`}
                          measureLocation={ProgressMeasureLocation.none}
                          value={convertToPercentage(storage)}
                          style={{ gridGap: 0 }} // PF issue with split & measureLocation
                        />
                      </SplitItem>
                      <SplitItem>
                        <Bullseye>
                          <Text component="small">{storage.maxValue}</Text>
                        </Bullseye>
                      </SplitItem>
                    </Split>
                  </StackItem>
                </Stack>
              </ListItem>
            ))}
            <ListItem>
              <Button
                variant="link"
                isInline
                icon={<PlusCircleIcon />}
                onClick={() => alert('Not implemented')}
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

export default WorkspaceStorageBars;

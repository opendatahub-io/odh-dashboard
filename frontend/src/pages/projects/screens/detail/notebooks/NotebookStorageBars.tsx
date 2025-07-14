import * as React from 'react';
import {
  Alert,
  Flex,
  FlexItem,
  List,
  ListItem,
  Spinner,
  Stack,
  StackItem,
  Content,
} from '@patternfly/react-core';

import { NotebookKind } from '#~/k8sTypes';
import useNotebookPVCItems from '#~/pages/projects/pvc/useNotebookPVCItems';
import StorageSizeBar from '#~/pages/projects/components/StorageSizeBars';
import { getNotebookPVCMountPathMap } from '#~/pages/projects/notebook/utils';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { ProjectObjectType } from '#~/concepts/design/utils';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import InlineTruncatedClipboardCopy from '#~/components/InlineTruncatedClipboardCopy';
import ShowAllButton from './ShowAllButton';

type NotebookStorageBarsProps = {
  notebook: NotebookKind;
};

const NotebookStorageBars: React.FC<NotebookStorageBarsProps> = ({ notebook }) => {
  const [pvcs, loaded, loadError] = useNotebookPVCItems(notebook);
  const mountFolderMap = getNotebookPVCMountPathMap(notebook);
  const [showAll, setShowAll] = React.useState(false);
  const defaultVisibleLength = 2;
  const visiblePvcs = showAll ? pvcs : pvcs.slice(0, defaultVisibleLength);

  return (
    <Stack hasGutter>
      <StackItem>
        <strong data-testid="notebook-storage-bar-title">Cluster storage</strong>
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
            {visiblePvcs.map((pvc) => (
              <ListItem key={pvc.metadata.name}>
                <Flex
                  gap={{ default: 'gapSm' }}
                  alignItems={{ default: 'alignItemsFlexStart' }}
                  flexWrap={{ default: 'nowrap' }}
                >
                  <FlexItem>
                    <HeaderIcon
                      display="block"
                      type={ProjectObjectType.clusterStorage}
                      size={20}
                      padding={2}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Content>{getDisplayNameFromK8sResource(pvc)}</Content>
                    <Stack>
                      <StackItem>
                        <StorageSizeBar pvc={pvc} />
                      </StackItem>
                      <StackItem>
                        <Content>
                          Mount path:{' '}
                          {mountFolderMap[pvc.metadata.name] ? (
                            <InlineTruncatedClipboardCopy
                              maxWidth={225}
                              testId="storage-mount-path"
                              textToCopy={mountFolderMap[pvc.metadata.name]}
                            />
                          ) : (
                            'unknown'
                          )}
                        </Content>
                      </StackItem>
                    </Stack>
                  </FlexItem>
                </Flex>
              </ListItem>
            ))}
          </List>
        )}
      </StackItem>
      <StackItem>
        <ShowAllButton
          isExpanded={showAll}
          visibleLength={defaultVisibleLength}
          onToggle={() => setShowAll(!showAll)}
          totalSize={pvcs.length}
        />
      </StackItem>
    </Stack>
  );
};

export default NotebookStorageBars;

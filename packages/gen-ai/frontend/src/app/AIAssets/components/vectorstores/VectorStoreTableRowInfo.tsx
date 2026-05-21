import * as React from 'react';
import {
  Button,
  ButtonVariant,
  ClipboardCopy,
  Content,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ExternalVectorStoreSummary } from '~/app/types';

type VectorStoreTableRowInfoProps = {
  store: ExternalVectorStoreSummary;
};

const VectorStoreTableRowInfo: React.FC<VectorStoreTableRowInfoProps> = ({ store }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {store.vector_store_name}
      <Popover
        position="right"
        isVisible={isOpen}
        shouldOpen={() => {
          setIsOpen(true);
          fireMiscTrackingEvent('Available Endpoints Vector Store Info Viewed', {
            collectionName: store.vector_store_name,
            providerType: store.provider_type,
          });
        }}
        shouldClose={() => setIsOpen(false)}
        headerContent="Vector store details"
        bodyContent={
          <Stack hasGutter>
            <StackItem>
              <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                Provider ID
              </Content>
              <ClipboardCopy
                hoverTip="Copy provider ID"
                clickTip="Copied"
                aria-label="Copy provider ID"
                onCopy={() =>
                  fireMiscTrackingEvent('Available Endpoints Vector Store Info Copied', {
                    copyTarget: 'provider_id',
                    collectionName: store.vector_store_name,
                  })
                }
              >
                {store.provider_id}
              </ClipboardCopy>
            </StackItem>
            <StackItem>
              <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                Provider type
              </Content>
              <ClipboardCopy
                hoverTip="Copy provider type"
                clickTip="Copied"
                aria-label="Copy provider type"
                onCopy={() =>
                  fireMiscTrackingEvent('Available Endpoints Vector Store Info Copied', {
                    copyTarget: 'provider_type',
                    collectionName: store.vector_store_name,
                  })
                }
              >
                {store.provider_type}
              </ClipboardCopy>
            </StackItem>
            <StackItem>
              <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                Vector store ID
              </Content>
              <ClipboardCopy
                hoverTip="Copy ID"
                clickTip="Copied"
                aria-label="Copy vector store ID"
                onCopy={() =>
                  fireMiscTrackingEvent('Available Endpoints Vector Store Info Copied', {
                    copyTarget: 'vector_store_id',
                    collectionName: store.vector_store_name,
                  })
                }
              >
                {store.vector_store_id}
              </ClipboardCopy>
            </StackItem>
          </Stack>
        }
      >
        <Button
          variant={ButtonVariant.plain}
          aria-label="More info"
          style={{ paddingTop: 0, paddingBottom: 0 }}
        >
          <InfoCircleIcon />
        </Button>
      </Popover>
    </>
  );
};

export default VectorStoreTableRowInfo;

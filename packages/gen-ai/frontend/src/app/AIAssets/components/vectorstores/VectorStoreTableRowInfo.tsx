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
              >
                {store.provider_type}
              </ClipboardCopy>
            </StackItem>
            <StackItem>
              <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                Vector store ID
              </Content>
              <ClipboardCopy hoverTip="Copy ID" clickTip="Copied" aria-label="Copy vector store ID">
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
          onClick={() => setIsOpen(!isOpen)}
        >
          <InfoCircleIcon />
        </Button>
      </Popover>
    </>
  );
};

export default VectorStoreTableRowInfo;

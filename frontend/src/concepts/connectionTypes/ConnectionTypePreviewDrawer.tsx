import React from 'react';
import {
  Drawer,
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  Title,
  DrawerPanelBody,
  Card,
  CardBody,
  Text,
} from '@patternfly/react-core';
import ConnectionTypePreview from '~/concepts/connectionTypes/ConnectionTypePreview';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';

type Props = {
  children?: React.ReactNode;
  isExpanded: boolean;
  onClose: () => void;
  obj: ConnectionTypeConfigMapObj;
};

const ConnectionTypePreviewDrawer: React.FC<Props> = ({ children, isExpanded, onClose, obj }) => {
  const panelContent = (
    <DrawerPanelContent
      isResizable
      style={{
        backgroundColor: 'var(--pf-v5-global--BackgroundColor--200)',
      }}
    >
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          Preview connection type
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={() => onClose()} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody>
        <div
          style={{
            paddingBottom: 'var(--pf-v5-global--spacer--lg)',
          }}
        >
          <Text component="small">
            This preview shows the user view of the connection type form, and is for reference only.
            Updates in the developer view are automatically in the user view.
          </Text>
          <Card
            isFlat
            isRounded
            style={{
              marginTop: 'var(--pf-v5-global--spacer--md)',
            }}
          >
            <CardBody>
              <ConnectionTypePreview obj={obj} />
            </CardBody>
          </Card>
        </div>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isExpanded} isInline>
      <DrawerContent panelContent={panelContent}>{children}</DrawerContent>
    </Drawer>
  );
};

export default ConnectionTypePreviewDrawer;

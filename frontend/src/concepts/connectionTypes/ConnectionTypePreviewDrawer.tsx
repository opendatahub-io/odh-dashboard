import React from 'react';
import {
  Drawer,
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  Title,
  Card,
  CardBody,
  Divider,
  DrawerContentBody,
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
    <DrawerPanelContent isResizable>
      <DrawerContentBody>
        <DrawerHead hasNoPadding>
          <Title headingLevel="h2" size="xl">
            Preview connection type
          </Title>
          <DrawerActions>
            <DrawerCloseButton onClick={() => onClose()} />
          </DrawerActions>
        </DrawerHead>
        <div
          style={{
            fontSize: 'var(--pf-v5-global--FontSize--sm)',
            paddingTop: 'var(--pf-v5-global--spacer--sm)',
          }}
        >
          This preview shows the user view of the connection type form, and is for reference only.
          Updates in the developer view are automatically in the user view.
        </div>
      </DrawerContentBody>
      <Divider />
      <DrawerContentBody
        style={{
          backgroundColor: 'var(--pf-v5-global--BackgroundColor--200)',
          overflow: 'auto',
        }}
      >
        <Card isFlat isRounded>
          <CardBody>
            <ConnectionTypePreview obj={obj} />
          </CardBody>
        </Card>
      </DrawerContentBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isExpanded} isInline>
      <DrawerContent panelContent={panelContent}>{children}</DrawerContent>
    </Drawer>
  );
};

export default ConnectionTypePreviewDrawer;

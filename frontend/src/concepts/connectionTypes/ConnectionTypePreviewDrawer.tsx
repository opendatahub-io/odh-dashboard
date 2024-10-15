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
import ConnectionTypeForm from '~/concepts/connectionTypes/ConnectionTypeForm';
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
        <DrawerHead>
          <Title headingLevel="h2" size="xl">
            Preview connection type
          </Title>
          <DrawerActions>
            <DrawerCloseButton onClick={() => onClose()} />
          </DrawerActions>
        </DrawerHead>
        <div
          style={{
            fontSize: 'var(--pf-t--global--font--size--sm)',
            paddingTop: 'var(--pf-t--global--spacer--sm)',
          }}
        >
          This preview shows the user view of the connection type form, and is for reference only.
          Updates in the developer view are automatically rendered in the user view.
        </div>
      </DrawerContentBody>
      <Divider />
      <DrawerContentBody
        style={{
          backgroundColor:
            'var(--pf-t--temp--dev--tbd)' /* CODEMODS: original v5 color was --pf-v5-global--BackgroundColor--200 */,
          overflow: 'auto',
        }}
      >
        <Card>
          <CardBody>
            <ConnectionTypeForm isPreview connectionType={obj} />
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

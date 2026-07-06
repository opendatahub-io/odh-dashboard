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
  Form,
  DrawerPanelBody,
} from '@patternfly/react-core';
import ConnectionTypeForm from '#~/concepts/connectionTypes/ConnectionTypeForm';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';

type Props = {
  children?: React.ReactNode;
  isExpanded: boolean;
  onClose: () => void;
  obj: ConnectionTypeConfigMapObj;
};

const ConnectionTypePreviewDrawer: React.FC<Props> = ({ children, isExpanded, onClose, obj }) => {
  const panelContent = (
    <DrawerPanelContent isResizable>
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          Preview connection type
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={() => onClose()} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        This preview shows the user view of the connection type form, and is for reference only.
        Updates in the developer view are automatically rendered in the user view.
      </DrawerPanelBody>
      <Divider />
      <DrawerPanelBody
        style={{
          backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
          overflow: 'auto',
        }}
      >
        <Card>
          <CardBody>
            <Form>
              <Title headingLevel="h1">Create connection</Title>
              <ConnectionTypeForm isPreview connectionType={obj} />
            </Form>
          </CardBody>
        </Card>
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

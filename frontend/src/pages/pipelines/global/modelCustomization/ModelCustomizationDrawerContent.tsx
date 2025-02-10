import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  DrawerPanelDescription,
  Title,
} from '@patternfly/react-core';

export interface ModelCustomizationDrawerContentArgs {
  title: string;
  description: string;
  body: React.ReactNode;
}

export interface ModelCustomizationDrawerContentRef {
  update: (args: ModelCustomizationDrawerContentArgs) => void;
}

interface ModelCustomizationDrawerContentProps {
  handleCloseDrawer: () => void;
}

const ModelCustomizationDrawerContent = React.forwardRef<
  ModelCustomizationDrawerContentRef,
  ModelCustomizationDrawerContentProps
>(({ handleCloseDrawer }, forwardedRef) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [body, setBody] = React.useState<React.ReactNode | null>(null);

  React.useImperativeHandle(
    forwardedRef,
    (): ModelCustomizationDrawerContentRef => ({
      update: (args) => {
        setTitle(args.title);
        setDescription(args.description);
        setBody(args.body);
      },
    }),
  );

  return (
    <DrawerPanelContent minSize="40%" maxSize="80%" isResizable data-testid="drawer-content">
      <DrawerHead>
        <Title data-testid="title" headingLevel="h3">
          {title}
        </Title>
        <DrawerActions>
          <DrawerCloseButton data-testid="close" onClick={handleCloseDrawer} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelDescription>{description}</DrawerPanelDescription>
      <DrawerPanelBody>{body}</DrawerPanelBody>
    </DrawerPanelContent>
  );
});

ModelCustomizationDrawerContent.displayName = 'ModelCustomizationDrawerContent';

export default ModelCustomizationDrawerContent;

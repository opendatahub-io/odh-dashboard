import {
  Popover,
  Spinner,
  Flex,
  FlexItem,
  Label,
  Content,
  Alert,
  AlertProps,
  LabelProps,
  ContentVariants,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import React from 'react';
import { ExclamationCircleIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { NotebookImageAvailability } from './const';
import { NotebookImage } from './types';

type NotebookImageDisplayNameProps = {
  notebookImage: NotebookImage | null;
  loaded: boolean;
  loadError?: Error;
  isExpanded?: boolean;
};

export const NotebookImageDisplayName = ({
  notebookImage,
  loaded,
  loadError,
  isExpanded,
}: NotebookImageDisplayNameProps): React.JSX.Element => {
  // if there was an error loading the image, display unknown WITHOUT a label
  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="error">Unknown</HelperTextItem>
      </HelperText>
    );
  }

  // If the image is not loaded, display a spinner
  if (!loaded || !notebookImage) {
    return <Spinner size="md" />;
  }

  // helper function to get the popover variant and text
  const getNotebookImagePopoverText = ():
    | Record<string, never>
    | {
        title: string;
        body: React.ReactNode;
        variant: AlertProps['variant'];
      } => {
    if (notebookImage.imageAvailability === NotebookImageAvailability.DISABLED) {
      return {
        title: 'Notebook image disabled',
        body: (
          <p>
            The <b>{notebookImage.imageDisplayName}</b> notebook image has been disabled. This
            workbench can continue using the image, but disabled images are not available for
            selection when creating new workbenches.
          </p>
        ),
        variant: 'info',
      };
    }
    if (notebookImage.imageAvailability === NotebookImageAvailability.DELETED) {
      const unknownBody = (
        <p>
          An <b>unknown</b> notebook image has been deleted. To run this workbench, select a new
          notebook image.
        </p>
      );
      const knownBody = (
        <p>
          The <b>{notebookImage.imageDisplayName}</b> notebook image has been deleted. To run this
          workbench, select a new notebook image.
        </p>
      );
      return {
        title: 'Notebook image deleted',
        body: notebookImage.imageDisplayName ? knownBody : unknownBody,
        variant: 'danger',
      };
    }

    return {};
  };

  // helper function to get the label color
  const getNotebookImageLabelColor = (): LabelProps['color'] => {
    switch (notebookImage.imageAvailability) {
      case NotebookImageAvailability.DISABLED:
        return 'grey';
      case NotebookImageAvailability.DELETED:
        return 'red';
      default:
        return undefined;
    }
  };

  // helper function to get the label icon
  const getNotebookImageIcon = (): LabelProps['icon'] => {
    switch (notebookImage.imageAvailability) {
      case NotebookImageAvailability.DISABLED:
        return <InfoCircleIcon />;
      case NotebookImageAvailability.DELETED:
        return <ExclamationCircleIcon />;
      default:
        return undefined;
    }
  };

  // If the image is enabled, just display the name, no label is needed
  if (notebookImage.imageAvailability === NotebookImageAvailability.ENABLED) {
    return (
      <>
        <HelperText>
          <HelperTextItem>{notebookImage.imageDisplayName}</HelperTextItem>
        </HelperText>
        {isExpanded && (
          <Content component={ContentVariants.small}>{notebookImage.tagSoftware}</Content>
        )}
      </>
    );
  }

  // get the popover title, body, and variant based on the image availability
  const { title, body, variant } = getNotebookImagePopoverText();

  // otherwise, return the popover with the label as the trigger
  return (
    <>
      <Flex>
        <FlexItem>
          <HelperText>
            <HelperTextItem
              data-testid="image-display-name"
              variant={notebookImage.imageDisplayName ? 'default' : 'indeterminate'}
            >
              {notebookImage.imageDisplayName || 'unknown'}
            </HelperTextItem>
          </HelperText>
        </FlexItem>
        <FlexItem>
          <Popover
            aria-label="Image display name popover"
            headerContent={<Alert variant={variant} isInline isPlain title={title} />}
            bodyContent={body}
          >
            <Label
              data-testid="notebook-image-availability"
              isCompact
              color={getNotebookImageLabelColor()}
              icon={getNotebookImageIcon()}
            >
              {notebookImage.imageAvailability}
            </Label>
          </Popover>
        </FlexItem>
      </Flex>
      {isExpanded && notebookImage.imageAvailability !== NotebookImageAvailability.DELETED && (
        <Content component={ContentVariants.small}>{notebookImage.tagSoftware}</Content>
      )}
    </>
  );
};

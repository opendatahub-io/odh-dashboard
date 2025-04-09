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
  Button,
} from '@patternfly/react-core';
import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { NotebookImageAvailability, NotebookImageStatus } from './const';
import { NotebookImage } from './types';

type NotebookImageDisplayNameProps = {
  isImageStreamProjectScoped: boolean;
  notebookImage: NotebookImage | null;
  loaded: boolean;
  loadError?: Error;
  isExpanded?: boolean;
  onUpdateImageClick: () => void;
};

export const NotebookImageDisplayName = ({
  isImageStreamProjectScoped,
  notebookImage,
  loaded,
  loadError,
  isExpanded,
  onUpdateImageClick,
}: NotebookImageDisplayNameProps): React.JSX.Element => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);

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
        footer?: React.ReactNode;
      } => {
    if (notebookImage.imageStatus === NotebookImageStatus.DELETED) {
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
    if (notebookImage.imageStatus === NotebookImageStatus.OUTDATED) {
      return {
        title: 'Notebook image outdated',
        body: (
          <p>
            The <b>{notebookImage.imageDisplayName}</b> notebook image is outdated, This workbench
            can continue using this version, but it will not get new version updates.
          </p>
        ),
        variant: 'warning',
        footer: (
          <Button
            data-testid="update-latest-version-button"
            variant="link"
            onClick={() => {
              setIsPopoverVisible(false);
              onUpdateImageClick();
            }}
          >
            Update to the latest version
          </Button>
        ),
      };
    }
    return {
      title: 'Latest image version',
      body: (
        <p>
          The <b>{notebookImage.imageDisplayName}</b> notebook image is stable, reliable, and is
          best suited for the current environment and task requirements.
        </p>
      ),
      variant: 'success',
    };
  };

  // helper function to get the label color
  const getNotebookImageLabelColor = (): LabelProps['color'] => {
    switch (notebookImage.imageStatus) {
      case NotebookImageStatus.DELETED:
        return 'red';
      case NotebookImageStatus.OUTDATED:
        return 'yellow';
      case NotebookImageStatus.LATEST:
        return 'green';
      default:
        return 'grey';
    }
  };

  // helper function to get the label icon
  const getNotebookImageIcon = (): LabelProps['icon'] => {
    switch (notebookImage.imageStatus) {
      case NotebookImageStatus.DELETED:
        return <ExclamationCircleIcon />;
      case NotebookImageStatus.OUTDATED:
        return <ExclamationTriangleIcon />;
      case NotebookImageStatus.LATEST:
        return <CheckCircleIcon />;
      default:
        return <InfoCircleIcon />;
    }
  };

  // get the popover title, body, and variant based on the image availability
  const { title, body, variant, footer } = getNotebookImagePopoverText();

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
            {notebookImage.imageStatus !== NotebookImageStatus.DELETED &&
              notebookImage.imageAvailability === NotebookImageAvailability.ENABLED &&
              isProjectScopedAvailable &&
              isImageStreamProjectScoped && (
                <HelperTextItem>
                  <Label
                    isCompact
                    variant="outline"
                    color="blue"
                    data-testid="project-scoped-label"
                    icon={
                      <img
                        style={{ height: '20px' }}
                        src={typedObjectImage(ProjectObjectType.project)}
                        alt=""
                      />
                    }
                  >
                    Project-scoped
                  </Label>
                </HelperTextItem>
              )}
          </HelperText>
        </FlexItem>
        {(notebookImage.imageStatus === NotebookImageStatus.DELETED ||
          notebookImage.imageAvailability === NotebookImageAvailability.DISABLED ||
          notebookImage.imageStatus === NotebookImageStatus.LATEST ||
          notebookImage.imageStatus === NotebookImageStatus.OUTDATED) && (
          <FlexItem>
            <Popover
              aria-label="Image display name popover"
              headerContent={<Alert variant={variant} isInline isPlain title={title} />}
              bodyContent={body}
              footerContent={footer}
              shouldOpen={() => setIsPopoverVisible(true)}
              shouldClose={() => setIsPopoverVisible(false)}
              isVisible={isPopoverVisible}
            >
              <Label
                onClick={(e) => e.preventDefault()}
                data-testid="notebook-image-availability"
                isCompact
                color={getNotebookImageLabelColor()}
                icon={getNotebookImageIcon()}
              >
                {notebookImage.imageStatus === NotebookImageStatus.DELETED
                  ? NotebookImageStatus.DELETED
                  : notebookImage.imageStatus || NotebookImageAvailability.DISABLED}
              </Label>
            </Popover>
          </FlexItem>
        )}
      </Flex>
      {isExpanded && notebookImage.imageStatus !== NotebookImageStatus.DELETED && (
        <Content component={ContentVariants.small}>{notebookImage.tagSoftware}</Content>
      )}
    </>
  );
};

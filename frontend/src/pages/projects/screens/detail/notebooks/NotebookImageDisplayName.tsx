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
import { useNavigate } from 'react-router';
import { ImageStreamStatus } from '~/concepts/notebooks/types';
import { ImageStreamKind, NotebookKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NotebookImageAvailability } from './const';
import { NotebookImage } from './types';
import NotebookUpdateImageModal from './NotebookUpdateImageModal';
import { getCurrentAndLatestNotebookImageVersionData } from './getNotebookImageVersionData';

type NotebookImageDisplayNameProps = {
  notebookImage: NotebookImage | null;
  notebookImageStatus: NotebookImageAvailability | ImageStreamStatus | null;
  images: ImageStreamKind[];
  notebook: NotebookKind;
  loaded: boolean;
  loadError?: Error;
  isExpanded?: boolean;
};

export const NotebookImageDisplayName = ({
  notebookImage,
  notebookImageStatus,
  images,
  notebook,
  loaded,
  loadError,
  isExpanded,
}: NotebookImageDisplayNameProps): React.JSX.Element => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const navigate = useNavigate();

  const onModalClose = () => {
    setIsModalOpen(false);
  };

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

  const notebookImageVersionData = getCurrentAndLatestNotebookImageVersionData(notebook, images);

  // helper function to get the popover variant and text
  const getNotebookImagePopoverText = ():
    | Record<string, never>
    | {
        title: string;
        body: React.ReactNode;
        variant: AlertProps['variant'];
        footer?: React.ReactNode;
      } => {
    if (!notebookImageStatus) {
      return {};
    }
    if (notebookImageStatus === NotebookImageAvailability.DISABLED) {
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
    if (notebookImageStatus === NotebookImageAvailability.DELETED) {
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
    if (notebookImageStatus === ImageStreamStatus.OUTDATED) {
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
              if (notebookImageVersionData) {
                setIsModalOpen(true);
              } else {
                navigate(
                  `/projects/${currentProject.metadata.name}/spawner/${notebook.metadata.name}`,
                );
              }
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
    if (!notebookImageStatus) {
      return undefined;
    }
    switch (notebookImageStatus) {
      case NotebookImageAvailability.DISABLED:
        return 'grey';
      case NotebookImageAvailability.DELETED:
        return 'red';
      case ImageStreamStatus.OUTDATED:
        return 'yellow';
      default:
        return 'green';
    }
  };

  // helper function to get the label icon
  const getNotebookImageIcon = (): LabelProps['icon'] => {
    if (!notebookImageStatus) {
      return undefined;
    }
    switch (notebookImageStatus) {
      case NotebookImageAvailability.DISABLED:
        return <InfoCircleIcon />;
      case NotebookImageAvailability.DELETED:
        return <ExclamationCircleIcon />;
      case ImageStreamStatus.OUTDATED:
        return <ExclamationTriangleIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  if (!notebookImageStatus) {
    return (
      <>
        <HelperText>
          <HelperTextItem>{notebookImage.imageDisplayName}</HelperTextItem>
        </HelperText>
        {notebookImage.imageAvailability !== NotebookImageAvailability.DELETED && isExpanded && (
          <Content component={ContentVariants.small}>{notebookImage.tagSoftware}</Content>
        )}
      </>
    );
  }

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
          </HelperText>
        </FlexItem>
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
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              onClick={() => {}}
              data-testid="notebook-image-availability"
              isCompact
              color={getNotebookImageLabelColor()}
              icon={getNotebookImageIcon()}
            >
              {notebookImageStatus}
            </Label>
          </Popover>
        </FlexItem>
      </Flex>
      {isExpanded && notebookImage.imageAvailability !== NotebookImageAvailability.DELETED && (
        <Content component={ContentVariants.small}>{notebookImage.tagSoftware}</Content>
      )}
      {isModalOpen && notebookImageVersionData && (
        <NotebookUpdateImageModal
          notebookImageVersionData={notebookImageVersionData}
          notebook={notebook}
          onModalClose={onModalClose}
        />
      )}
    </>
  );
};

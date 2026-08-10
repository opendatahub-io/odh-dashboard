import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  PageSection,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { Language } from '@patternfly/react-code-editor';
import { ExclamationCircleIcon, ExpandArrowsAltIcon } from '@patternfly/react-icons';
import useDarkMode from '~/app/hooks/useDarkMode';
import { useSubscriptionManagementYaml } from '~/app/hooks/useSubscriptionManagementYaml';

const CodeEditor = React.lazy(() =>
  import('@patternfly/react-code-editor').then((mod) => ({ default: mod.CodeEditor })),
);

type SubscriptionManagementYamlTabProps = {
  resourceName: string;
  resourceType: 'subscription' | 'authorizationpolicy';
};

const SubscriptionManagementYamlTab: React.FC<SubscriptionManagementYamlTabProps> = ({
  resourceName,
  resourceType,
}) => {
  const titleContent = 'YAML - read-only preview';
  const isDarkMode = useDarkMode();
  const [yaml, loaded, loadError] = useSubscriptionManagementYaml(resourceName, resourceType);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleModalToggle = () => {
    setIsModalOpen((open) => !open);
  };

  const customToolbarControl = (
    <Tooltip content="Open fullscreen">
      <Button
        variant="plain"
        aria-label="Open fullscreen editor"
        onClick={handleModalToggle}
        icon={<ExpandArrowsAltIcon />}
        data-testid="open-fullscreen-button"
      />
    </Tooltip>
  );

  if (!loaded) {
    return (
      <PageSection hasBodyWrapper={false}>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (loadError || !yaml) {
    return (
      <PageSection hasBodyWrapper={false}>
        <EmptyState icon={ExclamationCircleIcon} headingLevel="h3" titleText="Unable to load YAML">
          <EmptyStateBody>The YAML content could not be retrieved.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} data-testid="resource-yaml-tab-content">
      <React.Suspense
        fallback={
          <Bullseye>
            <Spinner />
          </Bullseye>
        }
      >
        <CodeEditor
          code={yaml}
          language={Language.yaml}
          isDarkTheme={isDarkMode}
          isReadOnly
          isCopyEnabled
          isDownloadEnabled
          isLanguageLabelVisible
          downloadFileName={resourceName}
          height="600px"
          headerMainContent={titleContent}
          customControls={customToolbarControl}
        />
        <Modal
          variant={ModalVariant.large}
          isOpen={isModalOpen}
          onClose={handleModalToggle}
          aria-label={titleContent}
          data-testid="yaml-fullscreen-modal"
        >
          <ModalHeader title={titleContent} />
          <ModalBody>
            <CodeEditor
              code={yaml}
              language={Language.yaml}
              isDarkTheme={isDarkMode}
              isReadOnly
              isCopyEnabled
              isDownloadEnabled
              isLanguageLabelVisible
              downloadFileName={resourceName}
              height="70vh"
              headerMainContent={titleContent}
            />
          </ModalBody>
        </Modal>
      </React.Suspense>
    </PageSection>
  );
};

export default SubscriptionManagementYamlTab;

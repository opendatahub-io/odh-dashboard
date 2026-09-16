import * as React from 'react';
import { Button, Content, Popover } from '@patternfly/react-core';
import NonKueueManagedProjectsModal from './NonKueueManagedProjectsModal';
import {
  KUEUE_HELP_LINK_TEXT,
  KUEUE_HELP_POPOVER_BODY,
  KUEUE_HELP_VIEW_PROJECTS_LINK,
} from '../const';
import useNonKueueManagedProjects from '../hooks/useNonKueueManagedProjects';

const InfrastructureKueueHelpLink: React.FC = () => {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { projects, loaded, error } = useNonKueueManagedProjects();

  const closePopover = (event: MouseEvent | KeyboardEvent) => {
    setIsPopoverOpen(false);
    if (event instanceof KeyboardEvent) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const openModal = () => {
    setIsPopoverOpen(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <Popover
        isVisible={isPopoverOpen}
        shouldOpen={() => setIsPopoverOpen(true)}
        shouldClose={closePopover}
        showClose
        withFocusTrap={false}
        bodyContent={
          <>
            <Content component="p">{KUEUE_HELP_POPOVER_BODY}</Content>
            <Button
              variant="link"
              isInline
              onClick={openModal}
              data-testid="view-non-kueue-managed-projects-link"
            >
              {KUEUE_HELP_VIEW_PROJECTS_LINK}
            </Button>
          </>
        }
      >
        <Button
          ref={triggerRef}
          variant="link"
          isInline
          data-testid="infrastructure-kueue-help-link"
        >
          {KUEUE_HELP_LINK_TEXT}
        </Button>
      </Popover>
      {isModalOpen && (
        <NonKueueManagedProjectsModal
          projects={projects}
          loaded={loaded}
          error={error}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default InfrastructureKueueHelpLink;

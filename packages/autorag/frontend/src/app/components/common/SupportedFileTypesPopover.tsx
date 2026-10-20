import { Button, Content, Popover, type PopoverProps } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React from 'react';

export const SUPPORTED_FILE_TYPES_CONTENT = (
  <>
    <Content component="p">Select or upload a file in one of the following formats:</Content>
    <Content component="p">
      <strong>Audio:</strong> .m4a, .mp3, .wav
    </Content>
    <Content component="p">
      Audio files are transcribed with Whisper Tiny before processing.
    </Content>
    <Content component="p">
      <strong>Images:</strong> .jpg, .jpeg, .png, .tiff, .tif
    </Content>
    <Content component="p">
      <strong>Documents:</strong> PDF, DOCX, PPTX, Markdown, HTML, Plain text, OpenDocument Text,
      OpenDocument Presentation, AsciiDoc, LaTeX, EPUB, EML, MSG, Markdown (Quarto), R Markdown,
      XHTML
    </Content>
  </>
);

type SupportedFileTypesPopoverProps = {
  children: React.ReactElement;
  /** Renders the popover content next to its trigger instead of portaling to document.body. */
  appendTo?: PopoverProps['appendTo'];
};

const SupportedFileTypesPopover: React.FC<SupportedFileTypesPopoverProps> = ({
  children,
  appendTo,
}) => (
  <Popover
    aria-label="Supported file types help"
    headerContent="Supported file types"
    bodyContent={SUPPORTED_FILE_TYPES_CONTENT}
    appendTo={appendTo}
  >
    {children}
  </Popover>
);

export const SupportedFileTypesLink: React.FC = () => (
  /* Inline appending keeps the popover content within the file-explorer modal's focus trap. */
  <SupportedFileTypesPopover appendTo="inline">
    <Button variant="link" isInline>
      View supported file types
    </Button>
  </SupportedFileTypesPopover>
);

export const SupportedFileTypesHelpButton: React.FC = () => (
  <SupportedFileTypesPopover>
    <DashboardPopupIconButton
      aria-label="View supported file types"
      icon={<OutlinedQuestionCircleIcon />}
      hasNoPadding
    />
  </SupportedFileTypesPopover>
);

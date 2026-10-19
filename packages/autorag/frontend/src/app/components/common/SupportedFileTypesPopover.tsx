import { Button, Content, Popover } from '@patternfly/react-core';
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

const SupportedFileTypesPopover: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <Popover
    aria-label="Supported file types help"
    headerContent="Supported file types"
    bodyContent={SUPPORTED_FILE_TYPES_CONTENT}
  >
    {children}
  </Popover>
);

export const SupportedFileTypesLink: React.FC = () => (
  <SupportedFileTypesPopover>
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

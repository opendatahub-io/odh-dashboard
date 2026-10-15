import { Button, Content, Modal, ModalBody, ModalHeader } from '@patternfly/react-core';
import React from 'react';

export const SUPPORTED_FILE_TYPES_DESCRIPTION = (
  <>
    <Content component="p">Select or upload a file in one of the following formats:</Content>
    <Content component="p">Audio: .m4a, .mp3, .wav</Content>
    <Content component="p">
      Audio files are transcribed with Whisper Tiny before processing.
    </Content>
    <Content component="p">Images: .jpg, .jpeg, .png, .tiff, .tif</Content>
    <Content component="p">
      Documents: PDF, DOCX, PPTX, Markdown, HTML, Plain text, OpenDocument Text, OpenDocument
      Presentation, AsciiDoc, LaTeX, EPUB, EML, MSG, Markdown (Quarto), R Markdown, XHTML
    </Content>
  </>
);

type SupportedFileTypesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SupportedFileTypesLink: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button variant="link" isInline onClick={onClick}>
    View supported file types
  </Button>
);

const SupportedFileTypesModal: React.FC<SupportedFileTypesModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} aria-labelledby="supported-file-types-title">
    <ModalHeader title="Supported file types" labelId="supported-file-types-title" />
    <ModalBody>{SUPPORTED_FILE_TYPES_DESCRIPTION}</ModalBody>
  </Modal>
);

export default SupportedFileTypesModal;

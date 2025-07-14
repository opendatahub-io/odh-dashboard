import * as React from 'react';
import DividedGallery from '#~/concepts/design/DividedGallery';

type InfoGalleryProps = {
  infoItems: React.ReactNode[];
  closeAlt: string;
  onClose: () => void;
  closeTestId: string;
};

const InfoGallery: React.FC<InfoGalleryProps> = ({ infoItems, closeAlt, onClose, closeTestId }) =>
  infoItems.length > 0 ? (
    <DividedGallery
      minSize="225px"
      itemCount={infoItems.length}
      showClose
      closeAlt={closeAlt}
      onClose={onClose}
      closeTestId={closeTestId}
      style={{
        borderRadius: 16,
        border: `1px solid var(--pf-t--global--border--color--default)`,
      }}
    >
      {infoItems}
    </DividedGallery>
  ) : null;

export default InfoGallery;

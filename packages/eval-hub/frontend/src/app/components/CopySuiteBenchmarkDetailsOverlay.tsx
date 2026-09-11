import * as React from 'react';
import { Backdrop, Drawer, DrawerContent } from '@patternfly/react-core';
import { createPortal } from 'react-dom';
import BenchmarkDrawerPanel from '~/app/components/BenchmarkDrawerPanel';
import type { FlatBenchmark } from '~/app/types';

import './CopySuiteBenchmarkDetailsOverlay.scss';

type CopySuiteBenchmarkDetailsOverlayProps = {
  benchmark: FlatBenchmark | undefined;
  isOpen: boolean;
  onClose: () => void;
  onPrimaryAction: (benchmark: FlatBenchmark) => void;
  primaryActionLabel: string;
};

const CopySuiteBenchmarkDetailsOverlay: React.FC<CopySuiteBenchmarkDetailsOverlayProps> = ({
  benchmark,
  isOpen,
  onClose,
  onPrimaryAction,
  primaryActionLabel,
}) => {
  const overlay = (
    <Backdrop
      className={`evalhub-copy-suite-benchmark-details-overlay__backdrop${
        isOpen ? ' evalhub-copy-suite-benchmark-details-overlay__backdrop--open' : ''
      }`}
      data-testid="copy-suite-benchmark-details-backdrop"
      aria-hidden={!isOpen}
    >
      <div className="evalhub-copy-suite-benchmark-details-overlay__host">
        <Drawer
          isExpanded={isOpen}
          isInline={false}
          data-testid="copy-suite-benchmark-details-drawer"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              onClose();
            }
          }}
        >
          <DrawerContent
            id="copy-suite-benchmark-details-drawer"
            onClick={onClose}
            panelContent={
              <BenchmarkDrawerPanel
                benchmark={benchmark}
                onClose={onClose}
                onRunBenchmark={onPrimaryAction}
                primaryActionLabel={primaryActionLabel}
              />
            }
          />
        </Drawer>
      </div>
    </Backdrop>
  );

  if (typeof document === 'undefined') {
    return overlay;
  }

  return createPortal(overlay, document.body);
};

export default CopySuiteBenchmarkDetailsOverlay;

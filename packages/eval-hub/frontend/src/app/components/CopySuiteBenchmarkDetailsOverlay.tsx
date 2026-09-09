import * as React from 'react';
import { Backdrop, Drawer, DrawerContent } from '@patternfly/react-core';
import { createPortal } from 'react-dom';
import BenchmarkDrawerPanel from '~/app/components/BenchmarkDrawerPanel';
import type { FlatBenchmark } from '~/app/types';

import './CopySuiteBenchmarkDetailsOverlay.scss';

type CopySuiteBenchmarkDetailsOverlayProps = {
  benchmark: FlatBenchmark | undefined;
  onClose: () => void;
  onPrimaryAction: (benchmark: FlatBenchmark) => void;
  primaryActionLabel: string;
};

const CopySuiteBenchmarkDetailsOverlay: React.FC<CopySuiteBenchmarkDetailsOverlayProps> = ({
  benchmark,
  onClose,
  onPrimaryAction,
  primaryActionLabel,
}) => {
  const overlay = (
    <Backdrop data-testid="copy-suite-benchmark-details-backdrop">
      <div className="evalhub-copy-suite-benchmark-details-overlay__host">
        <Drawer isExpanded isInline={false} data-testid="copy-suite-benchmark-details-drawer">
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

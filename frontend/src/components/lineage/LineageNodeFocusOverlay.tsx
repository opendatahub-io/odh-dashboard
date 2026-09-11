import React from 'react';
import {
  Visualization,
  GRAPH_LAYOUT_END_EVENT,
  GRAPH_POSITION_CHANGE_EVENT,
  SELECTION_EVENT,
} from '@patternfly/react-topology';
import {
  activateLineageNode,
  getLineageNodeSelector,
  measureLineageNodeFocusTargets,
} from './lineageNodeFocus';
import './LineageNodeFocusOverlay.scss';

type LineageNodeFocusOverlayProps = {
  controller: Visualization;
};

const LineageNodeFocusOverlay: React.FC<LineageNodeFocusOverlayProps> = ({ controller }) => {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [targets, setTargets] = React.useState<ReturnType<typeof measureLineageNodeFocusTargets>>(
    [],
  );

  const refreshTargets = React.useCallback(() => {
    const container = overlayRef.current?.parentElement;
    if (!container) {
      return;
    }

    window.requestAnimationFrame(() => {
      setTargets(measureLineageNodeFocusTargets(controller, container));
    });
  }, [controller]);

  React.useEffect(() => {
    refreshTargets();

    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, refreshTargets);
    controller.addEventListener(GRAPH_POSITION_CHANGE_EVENT, refreshTargets);
    controller.addEventListener(SELECTION_EVENT, refreshTargets);

    const container = overlayRef.current?.parentElement;
    const resizeObserver = container ? new ResizeObserver(() => refreshTargets()) : undefined;
    if (resizeObserver && container) {
      resizeObserver.observe(container);
    }

    return () => {
      controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, refreshTargets);
      controller.removeEventListener(GRAPH_POSITION_CHANGE_EVENT, refreshTargets);
      controller.removeEventListener(SELECTION_EVENT, refreshTargets);
      resizeObserver?.disconnect();
    };
  }, [controller, refreshTargets]);

  return (
    <div ref={overlayRef} className="lineage-node-focus-overlay">
      {targets.map((target) => (
        <button
          key={target.id}
          type="button"
          tabIndex={0}
          aria-label={target.label}
          className="lineage-node-focus-button"
          style={{
            left: target.left,
            top: target.top,
            width: target.width,
            height: target.height,
            borderRadius: target.borderRadius,
          }}
          onClick={(e) => {
            const nodeGroup = overlayRef.current?.parentElement?.querySelector(
              getLineageNodeSelector(target.id),
            );
            if (nodeGroup instanceof Element) {
              activateLineageNode(nodeGroup, e.clientX, e.clientY);
            }
          }}
        />
      ))}
    </div>
  );
};

export default LineageNodeFocusOverlay;

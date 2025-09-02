/* eslint-disable camelcase */
import React from 'react';
import ReactDOM from 'react-dom';
import {
  Popover,
  Stack,
  StackItem,
  Button,
  Content,
  Flex,
  FlexItem,
  List,
  ListItem,
} from '@patternfly/react-core';
import { LineageNode, PopoverPosition } from '@odh-dashboard/internal/components/lineage/types.js';
import { FsObjectType, getEntityTypeIcon } from '../../../utils/featureStoreObjects.tsx';

export interface FeatureStoreLineageNodePopoverProps {
  node: LineageNode | null;
  position: PopoverPosition | null;
  isVisible: boolean;
  onClose: () => void;
}

const getFsObjectTypeLabel = (fsObjectType: FsObjectType): string => {
  const typeLabels: Record<FsObjectType, string> = {
    entity: 'Entity details',
    data_source: 'Data source details',
    feature_view: 'Feature view details',
    feature_service: 'Feature service details',
  };
  return typeLabels[fsObjectType] || fsObjectType;
};

const FeatureStoreLineageNodePopover: React.FC<FeatureStoreLineageNodePopoverProps> = ({
  node,
  position,
  isVisible,
  onClose,
}) => {
  if (!node || !position || !isVisible) {
    return null;
  }

  // Create a temporary div to act as the popover reference
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (popoverRef.current) {
      popoverRef.current.style.position = 'absolute';
      popoverRef.current.style.left = `${position.x}px`;
      popoverRef.current.style.top = `${position.y}px`;
      popoverRef.current.style.zIndex = '1000';
    }
  }, [position]);

  const popoverContent = (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        pointerEvents: 'none', // Prevents blocking other elements
      }}
    >
      <Popover
        isVisible={isVisible}
        shouldClose={() => onClose()}
        bodyContent={
          <Stack hasGutter>
            <StackItem>
              <Content>{node.description}</Content>
            </StackItem>
            <StackItem>
              <List>
                {node.features?.map((feature, index) => (
                  <ListItem key={index}>
                    <strong>Feature:</strong> {feature.name}
                  </ListItem>
                ))}
              </List>
            </StackItem>
          </Stack>
        }
        headerContent={
          <Flex>
            <FlexItem>{getEntityTypeIcon(node.entityType)}</FlexItem>
            <FlexItem>{node.label}</FlexItem>
          </Flex>
        }
        footerContent={
          <Flex>
            <FlexItem>
              <Button variant="secondary" onClick={() => undefined}>
                View {getFsObjectTypeLabel(node.fsObjectTypes)} details page
              </Button>
            </FlexItem>
            {node.fsObjectTypes === 'feature_view' && (
              <FlexItem>
                <Button variant="link" onClick={() => undefined}>
                  View all features
                </Button>
              </FlexItem>
            )}
          </Flex>
        }
        distance={20}
        enableFlip
        position="top"
      >
        <div style={{ width: '1px', height: '1px', pointerEvents: 'all' }} />
      </Popover>
    </div>
  );

  // Render the popover in a portal at the document root to avoid SVG constraints
  return ReactDOM.createPortal(popoverContent, document.body);
};

export default FeatureStoreLineageNodePopover;

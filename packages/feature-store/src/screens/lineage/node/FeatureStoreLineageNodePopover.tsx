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
import { LineageNode, PopoverPosition } from '@odh-dashboard/internal/components/lineage/types';
import { useNavigate } from 'react-router-dom';
import {
  featureDataSourceRoute,
  featureEntityRoute,
  featureServiceRoute,
  featureViewRoute,
} from 'src/routes.ts';
import { useFeatureStoreProject } from '../../../FeatureStoreContext.tsx';
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

const goToDetailsPage = (node: LineageNode, project: string): string | undefined => {
  const { fsObjectTypes } = node;
  switch (fsObjectTypes) {
    case 'entity':
      return featureEntityRoute(node.name, project);
    case 'data_source':
      return featureDataSourceRoute(node.name, project);
    case 'feature_view':
      return featureViewRoute(node.name, project);
    case 'feature_service':
      return featureServiceRoute(node.name, project);
    default:
      return undefined;
  }
};

const FeatureStoreLineageNodePopover: React.FC<FeatureStoreLineageNodePopoverProps> = ({
  node,
  position,
  isVisible,
  onClose,
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const { currentProject } = useFeatureStoreProject();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (popoverRef.current && position) {
      popoverRef.current.style.position = 'absolute';
      popoverRef.current.style.left = `${position.x}px`;
      popoverRef.current.style.top = `${position.y}px`;
      popoverRef.current.style.zIndex = '1000';
    }
  }, [position]);

  // Conditional rendering after all hooks
  if (!node || !position || !isVisible || !currentProject) {
    return null;
  }

  const popoverContent = (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        pointerEvents: 'auto',
        minWidth: '320px',
        maxWidth: '480px',
      }}
    >
      <Popover
        isVisible={isVisible}
        shouldClose={() => onClose()}
        minWidth="320px"
        maxWidth="480px"
        bodyContent={
          <Stack hasGutter style={{ minWidth: '280px' }}>
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
              <Button
                variant="secondary"
                onClick={() => {
                  const route = goToDetailsPage(node, currentProject);
                  if (route) {
                    navigate(route);
                  }
                }}
              >
                View {getFsObjectTypeLabel(node.fsObjectTypes)} details page
              </Button>
            </FlexItem>
            {node.fsObjectTypes === 'feature_view' && (
              <FlexItem>
                <Button
                  variant="link"
                  onClick={() => {
                    const searchParams = new URLSearchParams();
                    searchParams.set('featureView', node.name);
                    navigate(`/featureStore/features/${currentProject}?${searchParams.toString()}`);
                  }}
                >
                  View all features
                </Button>
              </FlexItem>
            )}
          </Flex>
        }
        distance={20}
        enableFlip
        position="top"
        withFocusTrap={false}
        hasNoPadding={false}
      >
        <div style={{ width: '20px', height: '20px', pointerEvents: 'all' }} />
      </Popover>
    </div>
  );

  // Render the popover in a portal at the document root to avoid SVG constraints
  return ReactDOM.createPortal(popoverContent, document.body);
};

export default FeatureStoreLineageNodePopover;

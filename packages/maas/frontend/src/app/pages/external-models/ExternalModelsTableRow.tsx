import * as React from 'react';
import { ResourceTr } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Flex, FlexItem, Label, Stack, StackItem } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseLabelLocation, PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { ExternalModel, ProviderRef } from '~/app/types/external-models';
import {
  ExternalModelsInfoPopoverLocation,
  ExternalModelsInfoPopoverTarget,
  MaaSEvents,
} from '~/app/types/event-tracking';
import { externalModelsColumns } from './columns';
import { GovernancePairingWarning, MissingMaaSModelRefWarning } from './const';
import {
  getExternalModelResource,
  getExternalModelStatusMessage,
  isAwaitingGovernancePairing,
  isMissingMaaSModelRef,
} from './utils';
import PathModal from './modals/ExternalModelsPathModal';
import ProviderURLModal from './modals/ExternalModelsProviderModal';
import ExternalModelsExpandedTableRow from './expanded/ExternalModelsExpandedTableRow';

const VISIBLE_LABEL_ROWS = 2;
const enum ToggleLocation {
  ARROW = 'arrow',
  PROVIDER_LABELS = 'provider-labels',
}

type ExternalModelTableRowProps = {
  externalModel: ExternalModel;
  rowIndex: number;
};

const ExternalModelTableRow: React.FC<ExternalModelTableRowProps> = ({
  externalModel,
  rowIndex,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [visibleLabelCount, setVisibleLabelCount] = React.useState(
    externalModel.providerRefs.length,
  );
  const labelsContainerRef = React.useRef<HTMLDivElement>(null);
  const [providerURLModalRef, setProviderURLModalRef] = React.useState<ProviderRef | null>(null);
  const [pathModalRef, setPathModalRef] = React.useState<ProviderRef | null>(null);

  const toggleExpanded = (toggleLocation: ToggleLocation) => {
    if (!isExpanded) {
      if (toggleLocation === ToggleLocation.ARROW) {
        fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODEL_ROW_EXPANDED, {
          modelStatus: externalModel.phase,
          providerCount: externalModel.providerRefs.length,
        });
      } else {
        fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_PROVIDER_LABELS_EXPANDED, {
          visibleProviderCount: visibleLabelCount,
        });
      }
    }

    setIsExpanded((prev) => !prev);
  };

  React.useLayoutEffect(() => {
    const container = labelsContainerRef.current;
    if (!container) {
      return undefined;
    }

    const updateClamp = () => {
      // Measure unconstrained layout first, then clip to the first N label rows.
      container.style.maxHeight = 'none';
      container.style.overflow = 'visible';

      const labels = Array.from(container.querySelectorAll<HTMLElement>('.pf-v6-c-label'));
      if (labels.length === 0) {
        container.style.maxHeight = '';
        container.style.overflow = '';
        setHasOverflow(false);
        setVisibleLabelCount(0);
        return;
      }

      const containerTop = container.getBoundingClientRect().top;
      const rowTops = [
        ...new Set(labels.map((label) => Math.round(label.getBoundingClientRect().top))),
      ].toSorted((a, b) => a - b);

      const nextHasOverflow = rowTops.length > VISIBLE_LABEL_ROWS;
      const visibleRowTops = new Set(rowTops.slice(0, VISIBLE_LABEL_ROWS));
      const nextVisibleCount = labels.filter((label) =>
        visibleRowTops.has(Math.round(label.getBoundingClientRect().top)),
      ).length;
      setHasOverflow((prev) => (prev === nextHasOverflow ? prev : nextHasOverflow));
      setVisibleLabelCount((prev) => (prev === nextVisibleCount ? prev : nextVisibleCount));

      if (rowTops.length >= VISIBLE_LABEL_ROWS) {
        const lastVisibleRowTop = rowTops[VISIBLE_LABEL_ROWS - 1];
        const lastVisibleRowBottom = Math.max(
          ...labels
            .filter((label) => Math.round(label.getBoundingClientRect().top) === lastVisibleRowTop)
            .map((label) => label.getBoundingClientRect().bottom),
        );
        container.style.maxHeight = `${lastVisibleRowBottom - containerTop}px`;
      } else {
        container.style.maxHeight = '';
      }
      container.style.overflow = 'hidden';
    };

    updateClamp();

    // Observe the cell width, not the clamped container (avoids ResizeObserver re-entry).
    const resizeRoot = container.parentElement;
    const observer = new ResizeObserver(updateClamp);
    if (resizeRoot) {
      observer.observe(resizeRoot);
    }
    window.addEventListener('resize', updateClamp);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateClamp);
    };
  }, [externalModel.providerRefs]);

  const showMoreToggle = hasOverflow || isExpanded;

  const nameCell = (
    <Td dataLabel={externalModelsColumns[1].label}>
      <TableRowTitleDescription
        data-testid="external-model-name-cell"
        title={
          <span data-testid="external-model-name">
            {externalModel.displayName ?? externalModel.name}
          </span>
        }
        description={externalModel.description ?? ''}
        truncateDescriptionLines={2}
        resource={getExternalModelResource(externalModel)}
        onShowPopover={() => {
          fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_INFO_POPOVER_VIEWED, {
            infoTarget: ExternalModelsInfoPopoverTarget.MODEL_REFERENCE,
            location: ExternalModelsInfoPopoverLocation.TABLE_CELL,
          });
        }}
      />
    </Td>
  );

  const externalProviderCell = (
    <Td dataLabel={externalModelsColumns[2].label}>
      <Stack hasGutter>
        <StackItem>
          <div ref={labelsContainerRef}>
            <Flex
              gap={{ default: 'gapSm' }}
              flexWrap={{ default: 'wrap' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
              data-testid="external-model-providers-container"
            >
              {externalModel.providerRefs.map((providerRef) => (
                <FlexItem key={providerRef.providerName}>
                  <Label
                    color="blue"
                    data-testid={`external-model-provider-name-${providerRef.providerName}`}
                  >
                    {providerRef.provider?.displayName ?? providerRef.providerName}
                  </Label>
                </FlexItem>
              ))}
            </Flex>
          </div>
        </StackItem>
        {showMoreToggle && (
          <StackItem>
            <Button
              variant="link"
              isInline
              onClick={() => toggleExpanded(ToggleLocation.PROVIDER_LABELS)}
              data-testid="external-model-providers-show-more-button"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </Button>
          </StackItem>
        )}
      </Stack>
    </Td>
  );

  const phaseCell = (
    <Td dataLabel={externalModelsColumns[3].label}>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <PhaseLabel
            location={PhaseLabelLocation.EXTERNAL_MODELS}
            forcePopover
            phase={externalModel.phase}
            statusMessage={getExternalModelStatusMessage(externalModel)}
            resourceType={PhaseResourceType.EXTERNAL_MODEL}
            onClick={() => {
              fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_INFO_POPOVER_VIEWED, {
                infoTarget: ExternalModelsInfoPopoverTarget.STATUS_LABEL,
                location: ExternalModelsInfoPopoverLocation.TABLE_CELL,
              });
            }}
          />
        </FlexItem>
        {isMissingMaaSModelRef(externalModel) ? (
          <FlexItem>
            <MissingMaaSModelRefWarning />
          </FlexItem>
        ) : (
          isAwaitingGovernancePairing(externalModel) && (
            <FlexItem>
              <GovernancePairingWarning />
            </FlexItem>
          )
        )}
      </Flex>
    </Td>
  );

  return (
    <>
      <Tbody isExpanded={isExpanded} data-testid="external-model-row">
        <ResourceTr resource={getExternalModelResource(externalModel)} isControlRow>
          <Td
            data-testid="expand-external-model"
            expand={{
              rowIndex,
              isExpanded,
              onToggle: () => toggleExpanded(ToggleLocation.ARROW),
            }}
          />
          {nameCell}
          {externalProviderCell}
          {phaseCell}
        </ResourceTr>
        <Tr isExpanded={isExpanded}>
          <Td colSpan={externalModelsColumns.length + 1}>
            <ExternalModelsExpandedTableRow
              externalModel={externalModel}
              setProviderURLModalRef={setProviderURLModalRef}
              setPathModalRef={setPathModalRef}
            />
          </Td>
        </Tr>
      </Tbody>
      <PathModal
        path={pathModalRef?.path ?? ''}
        isOpen={!!pathModalRef}
        onClose={() => {
          setPathModalRef(null);
        }}
        providerRef={pathModalRef?.provider?.provider ?? ''}
      />
      <ProviderURLModal
        isOpen={!!providerURLModalRef}
        onClose={() => {
          setProviderURLModalRef(null);
        }}
        providerURL={providerURLModalRef?.provider?.endpointUrl ?? ''}
        providerRef={providerURLModalRef?.provider?.provider ?? ''}
        targetModelId={providerURLModalRef?.targetModel ?? ''}
      />
    </>
  );
};

export default ExternalModelTableRow;

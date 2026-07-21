import * as React from 'react';
import { ResourceTr } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Flex, FlexItem, Label, Stack, StackItem } from '@patternfly/react-core';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseLabelLocation, PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { ExternalModel, ProviderRef } from '~/app/types/external-models';
import { externalModelsColumns } from './columns';
import { GovernancePairingWarning } from './const';
import {
  getExternalModelResource,
  getExternalModelStatusMessage,
  isAwaitingGovernancePairing,
} from './utils';
import PathModal from './modals/ExternalModelsPathModal';
import ProviderURLModal from './modals/ExternalModelsProviderModal';
import ExternalModelsExpandedTableRow from './expanded/ExternalModelsExpandedTableRow';

const VISIBLE_LABEL_ROWS = 2;

type ExternalModelTableRowProps = {
  externalModel: ExternalModel;
  rowIndex: number;
  setDeleteExternalModel: (externalModel: ExternalModel) => void;
};

const ExternalModelTableRow: React.FC<ExternalModelTableRowProps> = ({
  externalModel,
  rowIndex,
  setDeleteExternalModel,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const labelsContainerRef = React.useRef<HTMLDivElement>(null);
  const [providerURLModalRef, setProviderURLModalRef] = React.useState<ProviderRef | null>(null);
  const [pathModalRef, setPathModalRef] = React.useState<ProviderRef | null>(null);

  const toggleExpanded = () => {
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
        return;
      }

      const containerTop = container.getBoundingClientRect().top;
      const rowTops = [
        ...new Set(labels.map((label) => Math.round(label.getBoundingClientRect().top))),
      ].toSorted((a, b) => a - b);

      const nextHasOverflow = rowTops.length > VISIBLE_LABEL_ROWS;
      setHasOverflow((prev) => (prev === nextHasOverflow ? prev : nextHasOverflow));

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
              onClick={toggleExpanded}
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
          />
        </FlexItem>
        {isAwaitingGovernancePairing(externalModel) && (
          <FlexItem>
            <GovernancePairingWarning />
          </FlexItem>
        )}
      </Flex>
    </Td>
  );

  const actionsCell = (
    <Td isActionCell>
      <ActionsColumn
        data-testid="external-model-actions"
        items={[
          {
            title: 'Delete',
            onClick: () => setDeleteExternalModel(externalModel),
          },
        ]}
      />
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
              onToggle: toggleExpanded,
            }}
          />
          {nameCell}
          {externalProviderCell}
          {phaseCell}
          {actionsCell}
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
        providerRef={pathModalRef?.provider?.displayName ?? pathModalRef?.providerName ?? ''}
      />
      <ProviderURLModal
        isOpen={!!providerURLModalRef}
        onClose={() => {
          setProviderURLModalRef(null);
        }}
        providerURL={providerURLModalRef?.provider?.endpointUrl ?? ''}
        providerRef={
          providerURLModalRef?.provider?.displayName ?? providerURLModalRef?.providerName ?? ''
        }
        targetModelId={providerURLModalRef?.targetModel ?? ''}
      />
    </>
  );
};

export default ExternalModelTableRow;

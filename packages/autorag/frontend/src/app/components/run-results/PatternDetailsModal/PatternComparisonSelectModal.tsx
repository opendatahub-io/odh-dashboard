import React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { formatMetricName, formatMetricValue, formatPatternName } from '~/app/utilities/utils';

type ColumnDef = {
  label: string;
  getValue: (pattern: AutoragPattern) => React.ReactNode;
};

/** Columns for the comparison pattern selection table. */
const getColumns = (optimizedMetric: string): ColumnDef[] => [
  {
    label: 'Rank',
    getValue: () => null, // Rank comes from rankMap, injected in row rendering
  },
  {
    label: 'Name',
    getValue: () => null, // Uses a link button, handled in row rendering
  },
  {
    label: 'Model name',
    getValue: (p) => (
      <>
        {p.settings.generation.model_id}
        {p.settings.embedding.model_id && (
          <>
            <br />
            <small>{p.settings.embedding.model_id}</small>
          </>
        )}
      </>
    ),
  },
  {
    label: `${formatMetricName(optimizedMetric)} (Optimized)`,
    getValue: (p) =>
      p.scores[optimizedMetric]
        ? formatMetricValue(p.scores[optimizedMetric].mean)
        : p.final_score.toFixed(3),
  },
  {
    label: 'Retrieval method',
    getValue: (p) => p.settings.retrieval.method,
  },
  {
    label: 'Chunk method',
    getValue: (p) => p.settings.chunking.method,
  },
  {
    label: 'Number of chunks',
    getValue: (p) => p.settings.retrieval.number_of_chunks,
  },
  {
    label: 'Chunk size',
    getValue: (p) => p.settings.chunking.chunk_size,
  },
  {
    label: 'Chunk overlap',
    getValue: (p) => p.settings.chunking.chunk_overlap,
  },
];

type PatternComparisonSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patterns: AutoragPattern[];
  rankMap: Record<string, number>;
  currentPatternIndex: number;
  excludePatternIndex: number;
  optimizedMetric: string;
  onSelectPattern: (index: number) => void;
};

const PatternComparisonSelectModal: React.FC<PatternComparisonSelectModalProps> = ({
  isOpen,
  onClose,
  patterns,
  rankMap,
  currentPatternIndex,
  excludePatternIndex,
  optimizedMetric,
  onSelectPattern,
}) => {
  const columns = React.useMemo(() => getColumns(optimizedMetric), [optimizedMetric]);

  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(
    currentPatternIndex >= 0 ? currentPatternIndex : null,
  );

  React.useEffect(() => {
    if (isOpen) {
      setSelectedIndex(currentPatternIndex >= 0 ? currentPatternIndex : null);
    }
  }, [isOpen, currentPatternIndex]);

  const sortedIndices = React.useMemo(
    () =>
      patterns
        .map((_, i) => i)
        .filter((i) => i !== excludePatternIndex)
        .toSorted((a, b) => (rankMap[patterns[a].name] ?? 0) - (rankMap[patterns[b].name] ?? 0)),
    [patterns, excludePatternIndex, rankMap],
  );

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      data-testid="pattern-comparison-select-modal"
    >
      <ModalHeader title="Select pattern to compare" />
      <ModalBody>
        <Table variant="compact" data-testid="comparison-pattern-table">
          <Thead>
            <Tr>
              <Th />
              {columns.map((col) => (
                <Th key={col.label}>{col.label}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {sortedIndices.map((i) => {
              const pattern = patterns[i];
              const patternRank = rankMap[pattern.name] ?? 0;
              const isSelected = selectedIndex === i;

              return (
                <Tr
                  key={i}
                  isClickable
                  isRowSelected={isSelected}
                  onRowClick={() => setSelectedIndex(i)}
                  data-testid={`comparison-pattern-row-${i}`}
                >
                  <Td
                    select={{
                      rowIndex: i,
                      onSelect: () => setSelectedIndex(i),
                      isSelected,
                      variant: 'radio',
                    }}
                  />
                  <Td dataLabel="Rank" data-testid={`comparison-pattern-rank-${i}`}>
                    {patternRank}
                  </Td>
                  <Td dataLabel="Name" data-testid={`comparison-pattern-name-${i}`}>
                    <Button variant="link" isInline onClick={() => setSelectedIndex(i)}>
                      {formatPatternName(pattern.name)}
                    </Button>
                  </Td>
                  {columns.slice(2).map((col) => (
                    <Td key={col.label} dataLabel={col.label}>
                      {col.getValue(pattern)}
                    </Td>
                  ))}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose} data-testid="comparison-modal-cancel">
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={selectedIndex === null}
          onClick={() => {
            if (selectedIndex !== null) {
              onSelectPattern(selectedIndex);
              onClose();
            }
          }}
          data-testid="compare-pattern-confirm"
        >
          Compare pattern
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PatternComparisonSelectModal;

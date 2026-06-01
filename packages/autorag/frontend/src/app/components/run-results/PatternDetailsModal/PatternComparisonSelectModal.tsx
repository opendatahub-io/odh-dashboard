import React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { InnerScrollContainer, Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { formatMetricName, formatMetricValue, formatPatternName } from '~/app/utilities/utils';

type ColumnDef = {
  label: string;
  getValue: (pattern: AutoragPattern) => React.ReactNode;
};

/** Scrollable columns rendered after the sticky radio/rank/name columns. */
const getColumns = (optimizedMetric: string): ColumnDef[] => [
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

  const prevIsOpen = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setSelectedIndex(currentPatternIndex >= 0 ? currentPatternIndex : null);
    }
    prevIsOpen.current = isOpen;
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
      className="autorag-comparison-select-modal"
      data-testid="pattern-comparison-select-modal"
    >
      <ModalHeader title="Select pattern to compare" />
      <ModalBody>
        <InnerScrollContainer>
          <Table variant="compact" data-testid="comparison-pattern-table">
            <Thead>
              <Tr>
                <Th
                  isStickyColumn
                  stickyMinWidth="50px"
                  stickyLeftOffset="0"
                  screenReaderText="Select"
                />
                <Th isStickyColumn stickyMinWidth="70px" stickyLeftOffset="50px">
                  Rank
                </Th>
                <Th isStickyColumn hasRightBorder stickyMinWidth="120px" stickyLeftOffset="120px">
                  Name
                </Th>
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
                      isStickyColumn
                      stickyMinWidth="50px"
                      stickyLeftOffset="0"
                      select={{
                        rowIndex: i,
                        onSelect: () => setSelectedIndex(i),
                        isSelected,
                        variant: 'radio',
                      }}
                    />
                    <Td
                      dataLabel="Rank"
                      data-testid={`comparison-pattern-rank-${i}`}
                      isStickyColumn
                      stickyMinWidth="70px"
                      stickyLeftOffset="50px"
                    >
                      {patternRank}
                    </Td>
                    <Td
                      dataLabel="Name"
                      data-testid={`comparison-pattern-name-${i}`}
                      isStickyColumn
                      hasRightBorder
                      stickyMinWidth="120px"
                      stickyLeftOffset="120px"
                    >
                      <Button variant="link" isInline onClick={() => setSelectedIndex(i)}>
                        {formatPatternName(pattern.name)}
                      </Button>
                    </Td>
                    {columns.map((col) => (
                      <Td key={col.label} dataLabel={col.label}>
                        {col.getValue(pattern)}
                      </Td>
                    ))}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </InnerScrollContainer>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose} data-testid="comparison-modal-cancel">
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={selectedIndex === null || selectedIndex === currentPatternIndex}
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

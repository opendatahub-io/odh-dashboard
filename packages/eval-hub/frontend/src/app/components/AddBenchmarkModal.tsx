import * as React from 'react';
import {
  Button,
  Checkbox,
  Content,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { normalizeThreshold } from '~/app/utilities/evaluationUtils';
import type { Provider } from '~/app/types';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';

type AddBenchmarkModalProps = {
  providers: Provider[];
  existingBenchmarkIds: Set<string>;
  maxNewBenchmarks: number;
  onAdd: (benchmarks: CopySuiteBenchmark[]) => void;
  onClose: () => void;
};

const DEFAULT_THRESHOLD = 70;

const AddBenchmarkModal: React.FC<AddBenchmarkModalProps> = ({
  providers,
  existingBenchmarkIds,
  maxNewBenchmarks,
  onAdd,
  onClose,
}) => {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [filter, setFilter] = React.useState('');

  const availableBenchmarks = React.useMemo(() => {
    const benchmarks: {
      key: string;
      providerId: string;
      providerName: string;
      id: string;
      name: string;
      metrics: string[];
      primaryMetric?: string;
      threshold: number;
      datasetSize?: number;
      numFewShot?: number;
    }[] = [];

    providers.forEach((provider) => {
      (provider.benchmarks ?? []).forEach((pb) => {
        const key = `${provider.resource.id}:${pb.id}`;
        if (!existingBenchmarkIds.has(key)) {
          benchmarks.push({
            key,
            providerId: provider.resource.id,
            providerName: provider.title ?? provider.name,
            id: pb.id,
            name: pb.name,
            metrics: pb.metrics ?? [],
            primaryMetric: pb.primary_score?.metric,
            threshold: pb.pass_criteria
              ? normalizeThreshold(pb.pass_criteria.threshold)
              : DEFAULT_THRESHOLD,
            datasetSize: pb.dataset_size,
            numFewShot: pb.num_few_shot,
          });
        }
      });
    });

    return benchmarks;
  }, [providers, existingBenchmarkIds]);

  const filteredBenchmarks = React.useMemo(() => {
    if (!filter.trim()) {
      return availableBenchmarks;
    }
    const lower = filter.toLowerCase();
    return availableBenchmarks.filter(
      (b) =>
        b.name.toLowerCase().includes(lower) ||
        b.id.toLowerCase().includes(lower) ||
        b.providerName.toLowerCase().includes(lower),
    );
  }, [availableBenchmarks, filter]);

  const isAtSelectionLimit = selected.size >= maxNewBenchmarks;

  const toggleSelection = React.useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleAdd = React.useCallback(() => {
    const newBenchmarks: CopySuiteBenchmark[] = availableBenchmarks
      .filter((b) => selected.has(b.key))
      .map((b) => ({
        id: b.id,
        providerId: b.providerId,
        name: b.name,
        weight: 1,
        primaryMetric: b.primaryMetric ?? b.metrics[0],
        numSamples: b.datasetSize,
        datasetSize: b.datasetSize,
        randomSeed: b.numFewShot,
        threshold: b.threshold,
        availableMetrics: b.metrics,
      }));

    if (newBenchmarks.length > 0) {
      onAdd(newBenchmarks);
    }
  }, [availableBenchmarks, selected, onAdd]);

  return (
    <Modal isOpen onClose={onClose} variant="medium" data-testid="add-benchmark-modal">
      <ModalHeader title="Add benchmarks" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <SearchInput
              placeholder="Filter by name"
              value={filter}
              onChange={(_e, value) => setFilter(value)}
              onClear={() => setFilter('')}
              aria-label="Filter benchmarks"
              data-testid="add-benchmark-filter"
            />
          </StackItem>
          {isAtSelectionLimit && (
            <StackItem>
              <HelperText>
                <HelperTextItem variant="warning" data-testid="add-benchmark-limit-warning">
                  You can only add {maxNewBenchmarks} more benchmark
                  {maxNewBenchmarks === 1 ? '' : 's'}. Deselect one to choose a different benchmark.
                </HelperTextItem>
              </HelperText>
            </StackItem>
          )}
          <StackItem>
            {filteredBenchmarks.length === 0 ? (
              <Content component="p" data-testid="no-available-benchmarks">
                {availableBenchmarks.length === 0
                  ? 'All available benchmarks have already been added.'
                  : 'No benchmarks match the current filter.'}
              </Content>
            ) : (
              <Stack hasGutter>
                {filteredBenchmarks.map((b) => (
                  <StackItem key={b.key}>
                    <Checkbox
                      id={`add-benchmark-${b.key}`}
                      data-testid={`add-benchmark-checkbox-${b.id}`}
                      label={
                        <>
                          <strong>{b.name}</strong>
                          <Content
                            component="small"
                            style={{
                              display: 'block',
                              color: 'var(--pf-t--global--text--color--subtle)',
                            }}
                          >
                            {b.providerName} &middot; {b.id}
                          </Content>
                        </>
                      }
                      isChecked={selected.has(b.key)}
                      isDisabled={isAtSelectionLimit && !selected.has(b.key)}
                      onChange={() => toggleSelection(b.key)}
                    />
                  </StackItem>
                ))}
              </Stack>
            )}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          data-testid="add-benchmark-confirm"
          onClick={handleAdd}
          isDisabled={selected.size === 0}
        >
          Add selected ({selected.size})
        </Button>
        <Button variant="link" data-testid="add-benchmark-cancel" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddBenchmarkModal;

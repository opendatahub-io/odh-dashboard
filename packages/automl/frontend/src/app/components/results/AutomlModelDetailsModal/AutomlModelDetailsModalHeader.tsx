import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import type { ModelArtifact } from '~/app/types';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalHeaderProps = {
  model: ModelArtifact;
  rank: number;
};

function getOptimizedMetric(model: ModelArtifact): { name: string; value: number } | undefined {
  const evalMetric = model.context.model_config.eval_metric;
  if (typeof evalMetric !== 'string') {
    return undefined;
  }
  const metrics = model.context.metrics.test_data;
  if (!(evalMetric in metrics)) {
    return undefined;
  }
  return { name: evalMetric, value: Math.abs(metrics[evalMetric]) };
}

/** Format metric keys from snake_case to Title Case. */
function formatMetricName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const AutomlModelDetailsModalHeader: React.FC<AutomlModelDetailsModalHeaderProps> = ({
  model,
  rank,
}) => {
  const optimizedMetric = getOptimizedMetric(model);

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="automl-model-details-header">
      <div className="automl-model-details-header-item">
        <span className="automl-model-details-header-label">Rank</span>
        <span className="automl-model-details-header-value">{rank}</span>
      </div>
      {optimizedMetric && (
        <div className="automl-model-details-header-item">
          <span className="automl-model-details-header-label">
            {formatMetricName(optimizedMetric.name)} (Optimized)
          </span>
          <span className="automl-model-details-header-value">
            {optimizedMetric.value.toFixed(3)}
          </span>
        </div>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <Button
          variant="secondary"
          icon={<DownloadIcon />}
          onClick={handleDownload}
          data-testid="model-details-download"
        >
          Download
        </Button>
        <Tooltip content="Coming soon">
          <Button variant="primary" isDisabled data-testid="model-details-save-as">
            Save as
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default AutomlModelDetailsModalHeader;

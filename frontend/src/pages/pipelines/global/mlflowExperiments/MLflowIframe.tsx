import * as React from 'react';
import { mlflowIframeUrl } from '#~/routes/pipelines/mlflowExperiments';

const MlflowIframe = React.forwardRef<HTMLIFrameElement>((_, ref) => {
  return (
    <iframe
      ref={ref}
      title="MLflow Experiments Interface"
      // TODO: Replace with the actual MLflow URL when the fork deployment is ready
      src={mlflowIframeUrl}
      data-testid="mlflow-iframe"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
});

export default MlflowIframe;

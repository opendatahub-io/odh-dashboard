import * as React from 'react';
import { useThemeContext } from '#~/app/ThemeContext';
import { useMlflowPathSync } from './useMlflowPathSync';
import { MLFLOW_DARK_MODE_KEY } from './utils';

const MlflowIframe = React.forwardRef<HTMLIFrameElement>((_, ref) => {
  const { iframeRef, initIframeSrc } = useMlflowPathSync(ref);
  const { theme } = useThemeContext();

  // Sync ODH theme to MLflow localStorage (ODH is source of truth)
  React.useEffect(() => {
    const mlflowValue = localStorage.getItem(MLFLOW_DARK_MODE_KEY);
    const mlflowDarkMode = mlflowValue === 'true';
    const odhDarkMode = theme === 'dark';

    if (mlflowDarkMode !== odhDarkMode) {
      localStorage.setItem(MLFLOW_DARK_MODE_KEY, JSON.stringify(odhDarkMode));
    }
  }, [theme]);

  return (
    <iframe
      ref={iframeRef}
      title="MLflow Experiments Interface"
      src={initIframeSrc}
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

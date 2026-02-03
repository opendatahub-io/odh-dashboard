import * as React from 'react';
import { useThemeContext } from '#~/app/ThemeContext';
import { useMlflowPathSync } from './useMlflowPathSync';

const MlflowIframe = React.forwardRef<HTMLIFrameElement>((_, ref) => {
  const { iframeRef, initIframeSrc } = useMlflowPathSync(ref);
  const { theme: odhTheme, mlflowTheme, setMlflowTheme } = useThemeContext();

  React.useEffect(() => {
    if (mlflowTheme !== (odhTheme === 'dark')) {
      setMlflowTheme(odhTheme === 'dark');
    }
  }, [odhTheme, mlflowTheme, setMlflowTheme]);

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

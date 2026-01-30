/**
 * CSS styles to inject into the MLflow iframe.
 * These styles override the default MLflow UI to integrate it with the dashboard.
 */
export const MLFLOW_IFRAME_STYLES = `
  /* Hide navigation elements - we use the dashboard's nav instead */
  .du-bois-light-breadcrumb,
  .du-bois-dark-breadcrumb,
  header,
  aside {
    display: none !important;
  }

  /* Hide View docs button */
  a[data-component-id="mlflow.experiment-page.header.docs-link"] {
    display: none !important;
  }

  /* Hide Prompts button in side navigation */
  a[href$="/prompts"] {
    display: none !important;
  }

  /* Remove main element styling to blend with dashboard */
  main {
    margin: 0 !important;
    border-radius: 0 !important;
  }

  /* Disable workspace navigation links except experiments, compare-experiments, metric, and compare-runs pages */
  /* Allow: /experiments (ends), /experiments/, /experiments?, /compare-experiments (ends), /compare-experiments/, /compare-experiments?, /metric, /compare-runs */
  a[href^="#/workspaces/"]:not([href$="/experiments"]):not([href*="/experiments/"]):not([href*="/experiments?"]):not([href$="/compare-experiments"]):not([href*="/compare-experiments/"]):not([href*="/compare-experiments?"]):not([href*="/metric"]):not([href*="/compare-runs"]) {
    pointer-events: none;
    cursor: default;
  }

  /* Fix the AG Grid wrapper that has overflow: hidden */
  .css-19xi16 {
    overflow: auto !important;
  }

  /* Fix empty state overlap: add spacing above the heading */
  .du-bois-light-typography.css-19gy3hy,
  .du-bois-dark-typography.css-19gy3hy {
    margin-top: 80px !important;
  }
`;

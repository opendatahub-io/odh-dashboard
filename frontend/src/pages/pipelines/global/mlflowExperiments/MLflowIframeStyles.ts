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
  /* Allow: /experiments, /compare-experiments, /metric, /compare-runs, and the 404 "home page" link */
  a[href^="#/workspaces/"]:not([data-testid="error-view-link"]):not([href$="/experiments"]):not([href*="/experiments/"]):not([href*="/experiments?"]):not([href$="/compare-experiments"]):not([href*="/compare-experiments/"]):not([href*="/compare-experiments?"]):not([href$="/metric"]):not([href*="/metric?"]):not([href$="/compare-runs"]):not([href*="/compare-runs?"]) {
    pointer-events: none !important;
    cursor: default !important;
  }

  /* Fix scrolling in the AG Grid container wrapper (Check the empty state on  Models tab) */
  .ag-theme-balham {
    overflow: auto !important;
  }

  /* Fix empty state overlap: add spacing to the empty state container */
  div:has(img[src*="versions-empty"]) h3 {
    margin-top: 80px !important;
  }
`;

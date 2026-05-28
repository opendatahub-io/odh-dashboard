import('./bootstrap').catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to load application:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML =
      '<div style="padding:2rem">Failed to load application. Please refresh the page.</div>';
  }
});

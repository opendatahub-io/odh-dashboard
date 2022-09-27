import { pathToOdhRoute } from 'utilities/routeUtils';

test('Found static route', () => {
  const rte = pathToOdhRoute('/');
  if (rte && rte[0]) {
    expect(rte[0].label).toMatch('Enabled');
    expect(rte[0].path).toMatch('/');
  } else {
    fail('Expected to find static route');
  }
});

test('Found static route found with sub routes', () => {
  const rte = pathToOdhRoute('/notebookController/spawner');
  if (rte && rte[0] && rte[1]) {
    expect(rte[0].label).toMatch('Juypter');
    expect(rte[0].path).toMatch('/notebookController');
    expect(rte[1].label).toMatch('Start a notebook server');
    expect(rte[1].path).toMatch('/notebookController/spawner');
  } else {
    fail('Expected to find static route');
  }
});

test('Found dynamic route found with sub routes', () => {
  const rte = pathToOdhRoute('/notebook/:testNamespace/:testNotebookName');
  if (rte && rte[0] && rte[1]&& rte[2]) {
    expect(rte[0].label).toMatch('Notebook');
    expect(rte[0].path).toMatch('/notebook');
    expect(rte[1].label).toMatch('testNamespace');
    expect(rte[1].path).toMatch('/notebook/:testNamespace');
    expect(rte[2].label).toMatch('testNotebookName');
    expect(rte[2].path).toMatch('/notebook/:testNamespace/:testNotebookName');
  } else {
    fail('Expected to find static route');
  }
});

test('Static route was not found', () => {
  const rte = pathToOdhRoute('/badPath');
  if (rte) {
    expect(rte[0]).toBeNull();
  } else {
    fail('Expected to have an array with null value');
  }
});

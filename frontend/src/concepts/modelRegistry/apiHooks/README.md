# Experiment Runs Caching System

This caching system provides performance improvements for experiment runs, artifacts, and metric history by caching API responses until manually refreshed.

## Usage

### 1. Wrap your component tree with the cache provider

```tsx
import { ExperimentRunsCacheProvider } from '#~/concepts/modelRegistry/apiHooks/cached';

function App() {
  return (
    <ExperimentRunsCacheProvider>
      {/* Your experiment runs components */}
    </ExperimentRunsCacheProvider>
  );
}
```

### 2. Use cached hooks instead of regular hooks

Replace your existing hooks with cached versions:

```tsx
// Before
import useAllRuns from '#~/concepts/modelRegistry/apiHooks/useAllRuns';
import useExperimentRunById from '#~/concepts/modelRegistry/apiHooks/useExperimentRunById';
import useExperimentRunArtifacts from '#~/concepts/modelRegistry/apiHooks/useExperimentRunArtifacts';

// After
import {
  useCachedAllRuns,
  useCachedExperimentRunById,
  useCachedExperimentRunArtifacts,
} from '#~/concepts/modelRegistry/apiHooks/cached';
```

### 3. Cache management

Access cache management functions when needed:

```tsx
import { useExperimentRunsCache } from '#~/concepts/modelRegistry/apiHooks/cached';

function MyComponent() {
  const cache = useExperimentRunsCache();
  
  const handleRefresh = () => {
    cache.clearCache(); // Clear all cached data
  };
  
  const handleInvalidateRun = (runId: string) => {
    cache.invalidateRun(runId); // Remove specific run and its artifacts
  };
  
  return (
    <button onClick={handleRefresh}>
      Refresh Data
    </button>
  );
}
```

## Available Cached Hooks

- `useCachedAllRuns(params?)` - Cached version of `useAllRuns`
- `useCachedExperimentRunById(runId?)` - Cached version of `useExperimentRunById`
- `useCachedExperimentRunArtifacts(runId?)` - Cached version of `useExperimentRunArtifacts`
- `useCachedExperimentRunMetricHistory(runId?, metricName?)` - Cached version of `useExperimentRunMetricHistory`
- `useCachedExperimentRunsArtifacts(runs[])` - Cached version of `useExperimentRunsArtifacts`

## Cache Management Methods

- `clearCache()` - Clears all cached data
- `invalidateRun(runId)` - Removes a specific run and all its related data
- `invalidateAllRuns()` - Removes all cached runs (but keeps artifacts and metric history)

## Cache Structure

The cache maintains relationships between:
- **Runs**: Individual run data by run ID
- **All Runs**: Paginated run lists by query parameters
- **Artifacts**: Run artifacts by run ID (maintains run-to-artifacts relationship)
- **Metric History**: Metric history by run ID and metric name

## Benefits

1. **Performance**: Avoid duplicate API calls for the same data
2. **Consistency**: Maintain data relationships between artifacts and runs
3. **User Experience**: Faster navigation and data loading
4. **Flexibility**: Manual cache control when needed

## Important Notes

- The cache persists until manually cleared or the component unmounts
- All cached hooks maintain the same API as their non-cached counterparts
- The cache automatically maintains relationships between runs and their artifacts
- Cache keys are based on query parameters, so different filters will be cached separately 
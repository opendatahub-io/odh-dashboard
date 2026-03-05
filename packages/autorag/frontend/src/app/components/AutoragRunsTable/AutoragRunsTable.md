# AutoragRunsTable

A paginated table component for displaying AutoRAG pipeline runs.

## Usage

```text
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import type { PipelineRun } from '~/app/types';

const runs: PipelineRun[] = []; // your pipeline runs
const totalSize = 42;
const page = 1;
const pageSize = 20;

<AutoragRunsTable
  runs={runs}
  totalSize={totalSize}
  page={page}
  pageSize={pageSize}
  onPageChange={(newPage) => setPage(newPage)}
  onPerPageChange={(newSize) => {
    setPageSize(newSize);
    setPage(1);
  }}
  toolbarContent={
    <ToolbarGroup align={{ default: 'alignEnd' }}>
      <ToolbarItem>
        <Button variant="primary">Create experiment</Button>
      </ToolbarItem>
    </ToolbarGroup>
  }
/>
```

## Props

| Prop              | Type                         | Required | Description                                     |
| ----------------- | ---------------------------- | -------- | ----------------------------------------------- |
| `runs`            | `PipelineRun[]`              | Yes      | Pipeline runs to display.                       |
| `totalSize`       | `number`                     | Yes      | Total item count for pagination.                |
| `page`            | `number`                     | Yes      | Current 1-based page index.                     |
| `pageSize`        | `number`                     | Yes      | Items per page.                                 |
| `onPageChange`    | `(page: number) => void`     | Yes      | Called when the user changes page.              |
| `onPerPageChange` | `(pageSize: number) => void` | Yes      | Called when the user changes items per page.    |
| `toolbarContent`  | `React.ReactElement`         | No       | Optional toolbar content (e.g. action buttons). |

## Integration with usePipelineRuns

Use with `usePipelineRuns` for server-side pagination:

```text
const {
  runs,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  loaded,
  error,
} = usePipelineRuns(namespace);

// After loading...
<AutoragRunsTable
  runs={runs}
  totalSize={totalSize}
  page={page}
  pageSize={pageSize}
  onPageChange={setPage}
  onPerPageChange={setPageSize}
  toolbarContent={undefined}
/>
```

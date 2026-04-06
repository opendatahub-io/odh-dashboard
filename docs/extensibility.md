# ODH Dashboard Extensibility System

## Overview

The ODH Dashboard implements a powerful extensibility system that allows for modular functionality through plugins and extensions. This system enables the application to be extended with new features, routes, navigation items, and other components without modifying the core codebase.

## Core Concepts

### Extension Points vs Extensions

**Extension Point**: An extension point is a **specification** that defines where and how the application can be extended. It acts as a contract that describes what properties an extension must provide and how it will be used by the host application.

**Extension**: An extension is a concrete **instance** that implements an extension point specification. Extensions provide the actual functionality, components, or configuration that gets integrated into the application.

Think of it like this:
- Extension Point = Interface/Contract
- Extension = Implementation

### Extension Point Naming Convention

Extension point types should follow the naming convention:
```
namespace.feature[/sub-feature]
```

**Components:**
- `namespace`: Identifies the application or plugin context (e.g., `app`, `my-plugin`)
- `feature`: Describes the main functional area (e.g., `navigation`, `table`, `model-catalog`)
- `sub-feature`: (Optional) Provides further classification for related extension points (e.g., `item`, `column`)

**Examples:**
- `app.route` - Core application routes
- `app.navigation/href` - Navigation link items
- `my-plugin.dashboard/widget` - Dashboard widgets from a specific plugin


### Extension Flags

The `flags` property controls when extensions are available based on feature flag state:

- **`required`**: Array of feature flags that must be `true` for the extension to be active
- **`disallowed`**: Array of feature flags that must be `false` for the extension to be active

Extensions can be conditionally enabled using feature flags:

```typescript
const appRouteExtension = {
  type: 'app.route',
  flags: {
    required: ['MODEL_SERVING'],    // Must be enabled
    disallowed: ['LEGACY_MODE'],    // Must not be enabled
  },
  properties: {
    path: '/model-serving',
    component: () => import('./ModelServingPage'),
  },
}
```

## Design Principles for Extension Points

Extension points should follow these design principles:

1. **Static Properties First**: Use static properties for information that can be displayed to users immediately
2. **Limited Code References**: Only use code references for functionality that requires execution
3. **Lazy Resolution**: Resolve code references only when user interaction demands it

**Good Extension Design:**
```typescript
export type FeatureExtension = Extension<
  'app.feature',
  {
    // Static properties - available immediately
    id: string;
    title: string;
    description: string;
    category: string;
    
    // Code references - resolved only when needed
    component: ComponentCodeRef;
  }
>;
```

This design allows the UI to display feature cards with titles and descriptions immediately, while only loading the actual feature component when the user clicks on it.

## Code References and Lazy Loading

Code references are a fundamental aspect of the extension system. They enable **lazy loading** of extension code, meaning the actual implementation is only fetched and executed when needed.

### What is a Code Reference?

A `CodeRef` is a function that returns a Promise from a dynamic import, allowing lazy loading of any JavaScript value.

**Basic CodeRef Example:**
```typescript
// Async function that fetches status from an endpoint
// In './utils/getStatus.ts':
export const getStatus = async (): Promise<{ status: string; message: string }> => {
  const response = await fetch('/api/system/status');
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }
  return response.json();
};

// CodeRef to that function
const statusCodeRef: CodeRef<typeof getStatus> = () => import('./utils/getStatus').then(m => m.getStatus);
```

**ComponentCodeRef (Specialized for React):**
```typescript
// ComponentCodeRef is a specialized CodeRef for React components
export type ComponentCodeRef<Props = AnyObject> = CodeRef<{ 
  default: React.ComponentType<Props> 
}>;

// Example:
const pageComponent: ComponentCodeRef = () => import('./MyComponent');
// Resolves to: { default: React.ComponentType }
```

### Benefits of Code References

1. **Performance**: Code is only loaded when the extension is actually used
2. **Bundle Splitting**: Extensions can be in separate bundles
3. **Modularity**: Extensions can be developed and deployed independently

## Helper Components for Code References

The extensibility system provides specialized helper components for working with code references efficiently.

### LazyCodeRefComponent

`LazyCodeRefComponent` enables lazy rendering of any React component from code references without resolving them upfront through `useResolvedExtensions`.

**Usage Patterns:**

**Route Components:**
```tsx
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';

const AppRoutes: React.FC = () => {
  const routeExtensions = useExtensions(isRouteExtension);

  return (
    <Routes>
      {routeExtensions.map((extension) => (
        <Route
          key={extension.uid}
          path={extension.properties.path}
          element={
            <LazyCodeRefComponent
              component={extension.properties.component}
              fallback={<LoadingSpinner />}
            />
          }
        />
      ))}
    </Routes>
  );
};
```

**Benefits:**
- Works with any React component
- No need to use `useResolvedExtensions` for component rendering
- Components are loaded only when actually rendered
- Better performance through lazy loading

**Component Signature:**
```typescript
type LazyCodeRefComponentProps<T> = {
  component: () => Promise<React.ComponentType<T> | { default: React.ComponentType<T> }>;
  fallback?: React.ReactNode;
  props?: T;
};
```

### HookNotify

`HookNotify` allows you to execute React hooks from code references and get notified when their values change.

**Usage Pattern:**
```tsx
import { HookNotify } from '@odh-dashboard/plugin-core';

// Extension with hook code reference
const statusExtension: StatusExtension = {
  type: 'app.status-provider',
  properties: {
    id: 'cluster-status',
    statusProviderHook: () => import('./hooks/useClusterStatus'),
  },
};

// Consuming multiple hooks from extension
const StatusManager: React.FC = () => {
  const [statusReports, setStatusReports] = React.useState<Record<string, StatusReport>>({});
  const statusExtensions = useResolvedExtensions(isStatusExtension);

  return (
    <>
      {statusExtensions.map((extension) => (
        <HookNotify
          key={extension.uid}
          useHook={extension.properties.statusProviderHook}
          onNotify={(status) => {
            setStatusReports(prev => ({
              ...prev,
              [extension.properties.id]: status
            }));
          }}
          onUnmount={() => {
            setStatusReports(prev => {
              const { [extension.properties.id]: removed, ...rest } = prev;
              return rest;
            });
          }}
        />
      ))}
    </>
  );
};
```

**Benefits:**
- Execute hooks from code references
- Automatic cleanup when extensions are removed
- Efficient for gathering data from multiple hook-based extensions

**Component Signature:**
```typescript
type HookNotifyProps<H> = {
  useHook: H;
  args?: Parameters<H>;
  onNotify?: (value: ReturnValue<H> | undefined) => void;
  onUnmount?: () => void;
};
```

### Best Practices for Helper Components

1. **Use LazyCodeRefComponent for Any Component**: Prefer this over `useResolvedExtensions` for any component rendering (routes, modals, tabs, etc.)
2. **Use HookNotify for Data Collection**: When you need to aggregate data from multiple hook-based extensions

## Extension Hooks

The system provides two main hooks for consuming extensions:

### `useExtensions`

Returns extensions with **unresolved** code references.

```typescript
const extensions = useExtensions(isRouteExtension);
// extensions contain CodeRef functions, not the actual components
```

**When to use:**
- When you only need extension metadata
- When you'll resolve code references later or conditionally
- For better performance when resolution isn't immediately needed

### `useResolvedExtensions`

Returns extensions with **resolved** code references.

```typescript
const [resolvedExtensions, resolved, errors] = useResolvedExtensions(isRouteExtension);
// resolvedExtensions contain actual components, resolved is a boolean indicating completion
```

**Return Value:**
- `resolvedExtensions`: Extensions with resolved code references
- `resolved`: Boolean indicating if resolution is complete
- `errors`: Array of any resolution errors

**When to use:**
- When you need to execute extension code immediately
- When rendering components from extensions
- When you need the actual resolved values

### Key Differences

| Aspect | `useExtensions` | `useResolvedExtensions` |
|--------|----------------|------------------------|
| Code References | Unresolved (CodeRef functions) | Resolved (actual values) |
| Performance | Faster, no async operations | Slower, involves async resolution |
| Use Case | Metadata access, conditional loading | Immediate code execution |
| Return Type | Extension[] | [Extension[], boolean, unknown[]] |


## Creating Extension Points

To create a new extension point:

1. **Define the Extension Type**:
```typescript
export type MyExtension = Extension<
  'my-plugin.dashboard/widget',
  {
    title: string;
    description: string;
    category: string;
    component: ComponentCodeRef;
  }
>;
```

2. **Create Type Guard**:
```typescript
export const isMyExtension = (e: Extension): e is MyExtension => 
  e.type === 'my-plugin.dashboard/widget';
```

### Understanding Type Guards

A **type guard** is a function used to filter extensions when using `useExtensions` and `useResolvedExtensions`. Type guards serve two critical purposes:

1. **Type Safety**: They provide TypeScript with type information about the filtered extensions
2. **Extension Filtering**: They determine which extensions match your criteria

**Type Guard Usage:**
```typescript
const routeExtensions = useExtensions(isMyExtension);
// routeExtensions is now typed as LoadedExtension<RouteExtension>[]
```

**Parameterized Type Guards:**
Type guards can be parameterized for more fine-grained filtering. Use `React.useCallback` to prevent unnecessary re-renders:

```typescript
// Filter by extension type AND category
export const isDashboardWidget = (category?: string) => 
  (e: Extension): e is DashboardWidgetExtension => {
    if (e.type !== 'my-plugin.dashboard/widget') return false;
    return category ? e.properties.category === category : true;
  };

// Usage with useCallback
const categoryFilter = React.useCallback(isDashboardWidget('charts'), []);
const chartWidgets = useExtensions(categoryFilter);
```

## Best Practices

### Extension Point Design
- **Static Properties First**: Design extension points with static information that can be displayed immediately to users
- **Limited Code References**: Only use code references for functionality that requires execution, not for display data
- **Descriptive Namespaces**: Use clear namespaces (`app.table/column` vs `table`)
- **Minimal Interfaces**: Keep extension point interfaces focused and minimal
- **Comprehensive Types**: Provide complete TypeScript types with JSDoc comments

**Example of Good Extension Design:**
```typescript
// ✅ Good: Static properties for display, code refs for functionality
export type ModelExtension = Extension<
  'app.model-catalog/model',
  {
    // Static - displayed immediately
    id: string;
    name: string;
    description: string;
    tags: string[];
    version: string;
    
    // Dynamic - resolved when user interacts
    component: ComponentCodeRef<ModelProps>;
    deploymentHook?: CodeRef<() => DeploymentConfig>;
  }
>;

// ❌ Bad: Code references for display data
export type BadModelExtension = Extension<
  'app.model-catalog/model',
  {
    id: string;
    nameLoader: CodeRef<() => string>;        // Should be static
    descriptionLoader: CodeRef<() => string>; // Should be static
    component: ComponentCodeRef<ModelProps>;
  }
>;
```

### Code Reference Usage Patterns
- **User-Triggered Resolution**: Resolve code references only when user interaction demands it
- **Prefer Helper Components**: Use `LazyCodeRefComponent` and `HookNotify` over `useResolvedExtensions`
- **Static Before Dynamic**: Present static information immediately, load dynamic content on demand
- **Error Boundaries**: Always handle code reference resolution errors gracefully

**Interaction-Driven Loading Pattern:**
```tsx
const ModelCard: React.FC<{ extension: ModelExtension }> = ({ extension }) => {
  const [isDeploying, setIsDeploying] = React.useState(false);
  
  return (
    <Card>
      {/* Static properties - shown immediately */}
      <CardTitle>{extension.properties.name}</CardTitle>
      <CardBody>{extension.properties.description}</CardBody>
      <Tags>{extension.properties.tags}</Tags>
      
      {/* Code reference - resolved only when user clicks deploy */}
      <Button 
        onClick={() => setIsDeploying(true)}
        disabled={isDeploying}
      >
        Deploy Model
      </Button>
      
      {isDeploying && (
        <LazyCodeRefComponent
          component={extension.properties.component}
          fallback={<DeploymentSpinner />}
          props={{ modelId: extension.properties.id }}
        />
      )}
    </Card>
  );
};
```

### Performance Optimization
- **Precise Type Guards**: Use specific type guards with `useResolvedExtensions` to avoid resolving unnecessary code references
- **Use React.useCallback**: Always wrap parameterized type guards in `useCallback` to prevent unnecessary re-renders
- **Lazy Resolution**: Never resolve code references upfront unless immediately needed
- **Bundle Analysis**: Monitor plugin bundle sizes and optimize imports
- **Feature Flag Filtering**: Use flags to prevent loading unused extensions entirely
- **Memory Management**: Properly clean up resources in `HookNotify` components

## Chunk Naming Strategy

The build system uses a **single-chunk-per-plugin** strategy for extension code references. This section applies to extension packages that are bundled into the host application (i.e., workspace packages with a `./extensions` export). For Module Federation remotes, chunking is handled by each remote's own webpack build.

### Scope

The chunk grouping strategy **only affects dynamic imports originating from extension definition files** (files matching `extensions.ts` or files in an `extensions/` directory). Any other code-splitting within a plugin — such as `React.lazy()` route splitting inside components — retains normal webpack behavior and is not merged into the plugin chunk.

### Default Behavior

When a plugin defines code references with dynamic imports in its extension files, the build system automatically groups all modules from the same plugin package into a **single async chunk**. The chunk is named `plugin-<package-short-name>`.

For example, a plugin at `@odh-dashboard/kserve` with multiple code references:

```typescript
const extensions = [
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      deploy: () => import('./src/deploy').then((m) => m.deployKServeDeployment),
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      extractHardwareProfileConfig: () =>
        import('./src/hardware').then((m) => m.extractHardwareProfileConfig),
    },
  },
];
```

All three imports (`./src/deployments`, `./src/deploy`, `./src/hardware`) are bundled into one chunk named `plugin-kserve`. This reduces the number of network requests when a plugin's functionality is loaded.

### Custom Chunk Names with `webpackChunkName`

Extension authors can override the default grouping using webpack's [`webpackChunkName`](https://webpack.js.org/api/module-methods/#webpackchunkname) magic comment. This is useful when a plugin is large enough to benefit from logical separation into multiple chunks.

```typescript
const extensions = [
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      // Placed in its own chunk named "kserve-deploy"
      deploy: () =>
        import(/* webpackChunkName: "kserve-deploy" */ './src/deploy').then(
          (m) => m.deployKServeDeployment,
        ),
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      // Remains in the default "plugin-kserve" chunk
      watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
    },
  },
];
```

In this example, `./src/deploy` gets its own chunk (`kserve-deploy`) while `./src/deployments` stays in the default plugin chunk (`plugin-kserve`).

**Grouping related imports:** Multiple imports from different files can share a `webpackChunkName` to be grouped into the same chunk:

```typescript
// Both imports land in a chunk named "kserve-hardware"
extractHardwareProfileConfig: () =>
  import(/* webpackChunkName: "kserve-hardware" */ './src/hardwareProfiles').then(
    (m) => m.extractHardwareProfileConfig,
  ),
extractReplicas: () =>
  import(/* webpackChunkName: "kserve-hardware" */ './src/replicas').then(
    (m) => m.extractReplicas,
  ),
```

### Shared Modules

When a module is imported by both a named chunk and the default plugin chunk (or by two differently named chunks), the build system places it in the **default plugin chunk** rather than in any named chunk. This prevents a named chunk from becoming a hidden dependency of other chunks.

For example, if `./src/deploy` (in chunk `kserve-deploy`) and `./src/deployments` (in the default chunk) both import `./src/utils`, then `./src/utils` is placed in `plugin-kserve`. This keeps the named `kserve-deploy` chunk genuinely optional — loading the default plugin chunk does not force the browser to also fetch the named chunk.

### When to Use Custom Chunk Names

| Scenario | Recommendation |
|----------|---------------|
| Small plugin (< 50 KB) | Use default single-chunk grouping |
| Large plugin with distinct features | Split into logical chunks (e.g., deploy vs. monitoring) |
| Rarely used code paths | Separate into dedicated chunks to defer loading |
| Multiple imports from the same file | No need for `webpackChunkName` — they share the same module |

### Naming Convention

When using `webpackChunkName`, prefix the chunk name with the plugin name:

```typescript
// Good: prefixed with plugin name
import(/* webpackChunkName: "kserve-deploy" */ './src/deploy')

// Avoid: generic name may collide with other plugins
import(/* webpackChunkName: "deploy" */ './src/deploy')
```

## App Actions

Extensions frequently need to perform app-level side effects — navigating to a page, showing a toast notification, or opening a modal — in response to user interactions such as kebab menu clicks. These operations normally require React context (router, Redux, etc.), which is not available inside plain extension callback functions.

**`AppActions`** provides a framework-agnostic interface that the host application implements. Extension code can call these actions without importing React Router, Redux, or any host-internal module.

### Available Actions

| Action | Signature | Purpose |
|--------|-----------|---------|
| `navigate` | `(path, options?) => void` | Navigate to an in-app route (options: `{ state?, replace? }`) |
| `notification.success` | `(title, message?, actions?) => void` | Show a success toast |
| `notification.error` | `(title, message?, actions?) => void` | Show an error toast |
| `notification.info` | `(title, message?, actions?) => void` | Show an info toast |
| `notification.warning` | `(title, message?, actions?) => void` | Show a warning toast |
| `openModal` | `(component, props?) => ModalRef` | Open a modal component |

### Using in React Code (Extensions & Host)

Inside any React component that renders within the host application tree, use the `useAppActions` hook:

```tsx
import { useAppActions } from '@odh-dashboard/plugin-core';

const MyExtensionComponent: React.FC = () => {
  const { navigate, notification } = useAppActions();

  const handleDeploy = async () => {
    try {
      await deployModel(data);
      notification.success('Model deployed', `${data.name} is now serving.`);
      navigate(`/model-serving/${data.name}`);
    } catch (e) {
      notification.error('Deployment failed', e.message);
    }
  };

  return <Button onClick={handleDeploy}>Deploy</Button>;
};
```

### Using in Extension Functions (Non-React)

Pass the `AppActions` instance as a parameter to extension callback functions. The host
component obtains `AppActions` via `useAppActions()` and forwards it when calling the
extension's `CodeRef` function. The extension registers a lazy import in its extensions
array, and the implementation is a plain function in a separate file.

#### Example: extension-contributed row actions

> **Note**: The `ModelRegistryRowAction` extension point below is a **hypothetical future example**
> shown to illustrate the pattern. It is not implemented in the codebase today.

A model registry table row could define an extension point that lets other packages contribute row actions. The extension function is plain — no hooks, no context — and receives `AppActions` from the host:

```typescript
// 1. Extension point definition (model-registry)
type ModelRegistryRowAction = Extension<
  'model-registry.registered-model/row-action',
  {
    platform: string;
    title: string;
    onClick: CodeRef<(model: RegisteredModel, actions: AppActions) => void>;
    isDisabled?: CodeRef<(model: RegisteredModel) => boolean>;
  }
>;
```

```typescript
// 2. Extension registration (another-package/extensions.ts) — CodeRef lazy import
const extensions: Extension[] = [
  {
    type: 'model-registry.registered-model/row-action',
    properties: {
      platform: 'my-platform',
      title: 'Export to catalog',
      onClick: () => import('./src/actions').then((m) => m.exportAction),
    },
  },
];
```

```typescript
// 3. Extension implementation (another-package/src/actions.ts) — plain function, no React
export const exportAction = async (
  model: RegisteredModel,
  actions: AppActions,
): Promise<void> => {
  await exportModel(model);
  actions.notification.success('Model exported', `${model.name} was exported to the catalog.`);
  actions.navigate('/catalog');
};
```

```tsx
// 4. Host wiring (RegisteredModelTableRow.tsx)
const actions = useAppActions();
const [rowActionExtensions] = useResolvedExtensions(isModelRegistryRowAction);

const extensionActions: IAction[] = rowActionExtensions.map((ext) => ({
  title: ext.properties.title,
  onClick: () => ext.properties.onClick(rm, actions),
}));

// Merge with hardcoded actions
<ActionsColumn items={[...baseActions, ...extensionActions]} />
```

Without `AppActions`, the extension's `onClick` function could not navigate or show a toast — it has no access to React Router or Redux. The host bridges this gap by passing `AppActions` as a parameter.

### Opening Modals

`openModal` accepts a React component and renders it. The host injects `onClose` (which unmounts the modal); if the caller also passes `onClose`, both run when the modal closes:

```tsx
// ConfirmDeleteModal.tsx (extension-owned component)
type ConfirmDeleteModalProps = {
  onClose: () => void;
  resourceName: string;
};

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ onClose, resourceName }) => (
  <Modal isOpen onClose={onClose} title="Confirm Delete">
    <p>Delete {resourceName}?</p>
    <Button onClick={onClose}>Cancel</Button>
    <Button variant="danger" onClick={() => { /* delete logic */ onClose(); }}>
      Delete
    </Button>
  </Modal>
);

export default ConfirmDeleteModal;
```

```typescript
import ConfirmDeleteModal from './ConfirmDeleteModal';

// Opening from an extension function
actions.openModal(ConfirmDeleteModal, { resourceName: 'my-model' });
```

#### Closing modals

When the modal component calls `onClose`, the provider automatically unmounts it. If the
caller also passes `onClose` in props, both run — the provider cleans up first, then the
caller's callback fires with any arguments the modal passed (e.g. a confirmation boolean).

Some modals have actions (like `onSubmit` or `buttonActions`) that don't call `onClose`
internally. In these cases, use the `ModalRef` returned by `openModal` to close
programmatically:

```typescript
const ref = actions.openModal(ConnectionModal, {
  type: locationType,
  onSubmit: (connection) => {
    fillForm(connection);
    ref.close();
  },
});
```

### Design Guidelines

1. **Keep actions simple** — `AppActions` is intentionally a thin interface. Complex workflows should still live in dedicated extension components.
2. **Prefer `AppActions` over custom event bridges** — instead of dispatching custom DOM events for cross-boundary communication, pass `AppActions` through the extension function contract.
3. **Type your modal props** — `openModal` infers required props from the component type, so define a precise props interface on the modal component.
4. **Use `useAppActions` in React, pass explicitly in functions** — React code should use the hook; plain functions should receive `AppActions` as a parameter from the calling component.

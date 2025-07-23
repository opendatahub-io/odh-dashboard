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
{
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
```typescript
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
```typescript
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
```typescript
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

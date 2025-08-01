# Best Practices

The items and criteria of flexibility in what is a good thing to do. Sections should offer contradictions of things that are commonly done.

## React Coding

### Avoid Custom Styling

It is tempting to “just add a bit of CSS” for minor tweaks, but this usually indicates we are drifting away from native PatternFly behaviour and should reconsider the approach. If you feel the need to do CSS or applying "styles" or "className" properties to "nudge" or minorly manipulate your UI rendering, you're likely going in the wrong direction.

There are rare exceptions to break from this rule. See [Custom Components](#custom-components) & [PF Bugs & CSS Solutions](#pf-bugs--css-solutions).

### PF Bugs & CSS Solutions

Every now and then we run into a scenario where PF is not quite managing something the way we need it to manage it. Usually this has to do with a layout problem but sometimes can extend to compositions of components or "needing a bit more out of a component".

[`frontend/src/concepts/dashboard`](../frontend/src/concepts/dashboard) exists for this very reason. We have had the need to custom style and adjust PF components on occasion. Use this sparingly, the more we add in the custom space, the more we have to deal with PF upgrades breaking them.

### Custom Components

We are a PF first application. You should almost never have to reach into the toolbox for the "new and custom component" tool. If you do, best verify with the Advisors first.

If you get the go-ahead on a new component, place it in the [`frontend/src/components`](../frontend/src/components) folder. Goal is to make a folder if you need to compose a bunch of them together or create multiple variants (eg. the Table component).

### Hooks & Performance Considerations

Oftentimes developers write `React.useRef`, `React.useMemo`, and `React.useCallback` without thinking about use-cases. Avoid doing performance based optimizations when no gain is in sight. React is pretty performant on its own and we shouldn't jump the gun as there are implications for how they impact the code.

**When to use `useCallback` (reference stability matters):**

```typescript
// ✅ GOOD: Function passed as prop to child component
const handleItemClick = useCallback((id: string) => {
  setSelectedItem(id);
}, []);

return <ItemList onItemClick={handleItemClick} />;

// ✅ GOOD: Function used as useEffect dependency
const fetchData = useCallback(async () => {
  const data = await api.getData(filter);
  setData(data);
}, [filter]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// ✅ GOOD: Function returned from custom hook
const useItemActions = () => {
  const deleteItem = useCallback((id: string) => {
    // delete logic
  }, []);
  
  return { deleteItem };
};
```

**When NOT to use `useCallback` (unnecessary overhead):**

```typescript
// ❌ BAD: Simple event handler not passed as prop
const handleClick = useCallback(() => {
  setCount(count + 1);
}, [count]); // Recreates on every count change anyway!

// ✅ GOOD: Just use regular function
const handleClick = () => {
  setCount(prev => prev + 1);
};

// ❌ BAD: Function only used internally
const processData = useCallback(() => {
  return data.map(item => ({ ...item, processed: true }));
}, [data]);

// ✅ GOOD: Use useMemo for computations
const processedData = useMemo(() => {
  return data.map(item => ({ ...item, processed: true }));
}, [data]);
```

**Key principle:** Only memoize functions when their reference stability actually matters for performance or correctness.

For edge cases and advanced examples, see [this code example](code_examples.md).

### Custom Hooks

Oftentimes we will want to create custom hooks for reusability among multiple components. But this is not a requirement. Feel free to use custom hooks to co-locate related other hooks & business logic. Keep components simple so we can rely on easy-to-read code.

**Major criteria for creating custom hooks:**

- Must have a clear definition of input & output (make use of strict typing)
- Internally it must solve a single goal – which may be composing other custom hooks for that objective

**Output criteria:**

- Primitives don't need to be memoized
- Objects are optionally memoized (arrays, objects, etc) – determine this on if you think there is added value and/or you know it will be unstable references but same data (makes it easier on the user of your hook)
- Always memoize functions you send out of your custom hooks – [see the reason why](#hooks--performance-considerations)
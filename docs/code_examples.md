# Example

_Original author: @andrewballantyne_

JavaScript Closures in React can be hard to understand, but this example should help break down a very common example. _Stale function references_.

### Table of Contents

- [The Code Example](#the-code-example)
- [The Issue](#the-issue)
- [The Issue Explained](#the-issue-explained)
- [The Solution](#the-solution)

## The Code Example

Note: This is a hugely chopped down code example to only show what we are working with for the example.

```typescript jsx
// ...
const DropdownWithSwitch: React.FC<DropdownWithSwitchProps> = (props) => {
  const [isOpen, setOpen] = React.useState(false);
  // ...

  return (
    <DropdownWithSwitchToggle
      // ...
      isOpen={isOpen}
      onToggle={(v) => {
        setOpen(v);
      }}
    />
  );
};
```

```typescript jsx
// ...
const DropdownWithSwitchToggle: React.FC<DropdownWithSwitchToggleProps> = ({
  // ...
  isOpen,
  onToggle,
}) => {
  const handleMenuClick = (event: MouseEvent) => {
    if (true /* some logic */) {
      onToggle(false);
    }
  };
  React.useEffect(() => {
    window.addEventListener('click', handleMenuClick);
    return () => {
      window.removeEventListener('click', handleMenuClick);
    };
  }, []); // << note this is left empty and causes this example

  return (
    // ...
    <MenuToggle
      // ...
      onClick={() => {
        onToggle(!isOpen);
      }}
    />
    // ...
  );
};
```

So we can see by the example components -- we are crafting a `onToggle` callback inline in our `DropdownWithSwitch` component and passing it into `DropdownWithSwitchToggle`. Then we are creating a callback and using it inside a `useEffect` -- this seems all pretty straight forward, but our `useEffect` has no dependencies. Since we only want to invoke this once on mount -- is this really a problem?

## The Issue

Let us use some logs to help us see the underlying issue. Same component layout, just with some logs and additional `useEffect` calls to show how mounting works and what happens during the cycle of usage.

```typescript jsx
// ...
const DropdownWithSwitch: React.FC<DropdownWithSwitchProps> = (props) => {
  const [isOpen, setOpen] = React.useState(false);
  // ...

  console.debug('DropdownWithSwitch rendered');
  React.useEffect(() => {
    console.debug('DropdownWithSwitch mounted');
  }, []);
  // Let us get a random value to show case closures
  // eg. 0.000 << a random number between 0 and 1, as a string, 5 characters
  const rnd = Math.random().toString().slice(0, 5);
  console.debug('Random Number:', rnd);

  return (
    <DropdownWithSwitchToggle
      // ...
      isOpen={isOpen}
      onToggle={(v) => {
        setOpen(v);
        console.debug('OnToggle Random Number Printout!', rnd);
      }}
    />
  );
};
```

```typescript jsx
// ...
const DropdownWithSwitchToggle: React.FC<DropdownWithSwitchToggleProps> = ({
  // ...
  isOpen,
  onToggle,
}) => {
  console.debug('DropdownWithSwitchToggle rendered');
  React.useEffect(() => {
    console.debug('DropdownWithSwitchToggle mounted');
  }, []);

  const handleMenuClick = (event: MouseEvent) => {
    if (true /* some logic */) {
      console.debug('++outside click');
      onToggle(false);
    }
  };
  React.useEffect(() => {
    console.debug('...useEffect hook triggers');
    window.addEventListener('click', handleMenuClick);
    return () => {
      window.removeEventListener('click', handleMenuClick);
    };
  }, []); // << note this is left empty and causes this example

  return (
    // ...
    <MenuToggle
      // ...
      onClick={() => {
        console.debug('manual click');
        onToggle(!isOpen);
      }}
    />
    // ...
  );
};
```

Our console debugs will show this:

```text
// Render Cycle 1 -- first JavaScript pass
DropdownWithSwitch rendered
Random Number: 0.492
DropdownWithSwitchToggle rendered

// Hooks trigger (bottom hooks go first)
DropdownWithSwitchToggle mounted
...useEffect hook triggers
DropdownWithSwitch mounted

// Render Cycle 2 (some external logic caused us to re-render)
DropdownWithSwitch rendered
Random Number: 0.305
DropdownWithSwitchToggle rendered

// Callback handled (we clicked on the toggle)
manual click
OnToggle Random Number Printout! 0.305
```

So far so good! We are getting a random number and we are rendering it back on click! But we haven't triggered our window callback yet -- let us continue looking at more logs...

```text
// Render Cycle 3 (we set data, so new render)
DropdownWithSwitch rendered
Random Number: 0.694
DropdownWithSwitchToggle rendered

// Hook callback trigger (we trigger the click outside)
++outside click
OnToggle Random Number Printout! 0.492
```

`0.492`?? Why did we get our first random number and not the last one like the manual click??

## The Issue Explained

The lack of a dependency array can bite you in the butt in the long run... The current implementation will likely not have a problem with this due to some magic in the way React handles `useState`.

Originally, the `handleMenuClick` handler is connected to the window object at time of the first `useEffect` hook fire -- which is the instance (memory reference) of the handler at mount time. The handler uses `onToggle`, which is also the instance at mount time. The current setup is unlikely to be a problem -- since the current inline `onToggle` only invokes the `setOpen` (from `useState`) which never changes memory reference during the lifecycle of the component.

However, consider adding some non-pure call or logic in the `onToggle` inline handler in `DropdownWithSwitch` (such as our random number). This logic, when invoked via the `handleMenuClick` handler, will present stale information that it got on the first mount of the `DropdownWithSwitchToggle` component.

The reason this happens is a concept called "JavaScript closures" [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) -- where the scope of the variables are maintained throughout the lifecycle of that scope. This is one of the reasons why we have a dependency array on the `use[Callback|Effect|etc]` hooks from React. Which allows us to clean up old references and properly keep an up-to-date reference to the latest memory reference of props and internal variables (like our `onToggle`).

If we just present `onToggle` as-is to the `useEffect` in `DropdownWithSwitchToggle`, the `onToggle` is freshly created every time we re-render (as an inline anonymous function) and thus causes the `useEffect` to re-trigger as well as it found the reference to not be referentially equal to the last iteration (two inline functions never equal as they are freshly created each render pass). This isn't a _huge_ problem as we do nothing in the body of the `useEffect` hook but re-establish connection to the window object. If we instead did some set state or like logic that caused a re-render, we might get into an infinite loop of new `onToggle` causes `useEffect` to trigger which causes a re-render, which gives us a new `onToggle` ... and so forth.

We can naturally get around this annoyance using `useCallback` instead of the anonymous function and making it a singular reference based on some of its dependencies -- which in this case is none; because `setOpen` (from `useState`) is already referentially equal for the life of the component.

## The Solution

```typescript jsx
// ...
const DropdownWithSwitch: React.FC<DropdownWithSwitchProps> = (props) => {
  const [isOpen, setOpen] = React.useState(false);
  // ...

  const onToggle = React.useCallback((v) => {
    setOpen(v);
  }, []); // we can use `[]` here because `setOpen` is from `useState`

  return (
    <DropdownWithSwitchToggle
      // ...
      isOpen={isOpen}
      onToggle={onToggle}
    />
  );
};
```

```typescript jsx
// ...
const DropdownWithSwitchToggle: React.FC<DropdownWithSwitchToggleProps> = ({
  // ...
  isOpen,
  onToggle,
}) => {
  React.useEffect(() => {
    // Move the handler inside since we only care for 1 reference
    // of it per window event listener call
    const handleMenuClick = (event: MouseEvent) => {
      if (true /* some logic */) {
        onToggle(false);
      }
    };
    window.addEventListener('click', handleMenuClick);
    return () => {
      window.removeEventListener('click', handleMenuClick);
    };
  }, [onToggle]); // we add the toggle here

  return (
    // ...
    <MenuToggle
      // ...
      onClick={() => {
        onToggle(!isOpen);
      }}
    />
    // ...
  );
};
```

By using `useCallback` & properly linking our dependencies in our `useEffect`, we have successfully tied the operations together and now our handler will ALWAYS have the latest reference as it gets recreated everytime we create a new onToggle.

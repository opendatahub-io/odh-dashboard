# PR Review Guidelines

Here is a handy list of things to consider when doing a review on any PR.

## Initial Checks

- [ ] **Is it a code PR?** If yes, do they have an issue (no matter how small), linked and attached to the PR, describing the desired change or issue?
  > As it stands today, we don't have strict rules for non code changing PRs – such as README updates or doc changes

- [ ] **Our PR CI passes**

- [ ] **Have they answered the [PR template](../.github/pull_request_template.md) properly** – provided screenshots, have sane responses to the questions, etc

- [ ] **Does it have tests?** (Refer to [Testing](testing.md) documentation)

   - [ ] **Have you made sure to test the PR image on your cluster?** (this is critically important if there are permission changes since we only have cluster-admin locally; so if there are permission changes along with it, test with and without those permissions to verify the flow on-cluster)

- [ ] **You have followed the [Best Practices](best-practices.md)**

## Code Quality Review

- [ ] **Have you looked at all the code files?**

### File-Level Checks 

- [ ] **Every file looks sane** – this helps with anything our linter may not track, aim to be on the lookout for ways we can improve our CI to help avoid these cases in the future

- [ ] **Verified eslint ignore statements** – sometimes we want these (intentional console log statements), most times we do not

    - [ ] **No ignoring of React hook dependency errors** (there is rarely a good reason for this)

    - [ ] **No ignoring the use of `any` type without a very good reason** (must be commented above the ignore statement)

    - [ ] **No unnecessary ignores** – this is our "catch all" statement for this list; we can add specific issues we run across above this line

### React & TypeScript Best Practices

- [ ] **Verified the React & TypeScript gotchas to look out for:**
  - [ ] `as` is a bad keyword – this likely means you're violating TypeScript's assistance and thus probably have another error in your types that you are covering up
  - [ ] Optional chaining values accessed have fallback values
  - [ ] Has EitherNotBoth / EitherOrNone been considered when object props are in conflict?
  - [ ] Optional type properties are optional because they are truly optional (can optionally be passed / have a nice fallback) and not because it's easier for types (to get around a type error)
  - [ ] Components are properly broken down into good bite-sized efforts with 1 single goal
  - [ ] Components make liberal use of custom hooks** to store data and logic that is heavily coupled
  - [ ] Components avoid using useMemo for processes that are not computationally expensive
  - [ ] Referential stability has been maintained for variables through render loops and the use-cases has been considered for when it has changed

     - [ ] *All functions passed to another component have referential integrity* (exception being to PF components and onChange-esk handlers)

     - [ ] *Understanding use of referential integrity around new hooks added* – useMemo, useEffect, useCallback should all be dependant on referentially stable variables

  - [ ] **No `useEffect`s that take incoming props and computes them for a local `useState`** – this is `useMemo` with extra steps

  - [ ] **Passing objects to components that only need a few attributes** (Interface segregation)

## Functional Testing

- [ ] **Have you run the code?**

  - [ ] **Tested happy paths**

  - [ ] **Tested error flows**

     - [ ] **Does the flow handle error messages from the server or known failures in the flow?**

     - [ ] **Are buttons disabled when the accompanying fields have invalid data?**

     - [ ] **When network takes a moment, are buttons disabled from being spammed by the user**

     - [ ] **Do we use loading spinners when data takes a moment?** – note that network traffic varies for users, do not consider anything async on the network to be "fast"

- [ ] **UX has been involved**

## Final Approval

If all the checkboxes above can be checked, you should be good to add your LGTM to the PR.

## When in Doubt

If you run into new decisions on how to handle something, new annotations, or a change / deviation from the normal flow of our app, either counter it with something you're aware of or reach out to the UI Lead or UI Advisors to make sure this is acceptable. It is important for the Dashboard to continue building on existing functionality and terms we have before creating new ones. 
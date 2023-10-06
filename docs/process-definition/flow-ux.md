[bug and feature request flow]: flow-standard.md
[larger feature efforts]: flow-feature.md#the-overall-flow
[triage]: triage.md
[internal UX template]: https://github.com/opendatahub-io/odh-dashboard/issues/new/choose

# User Experience (UX) Flow

The UX team performs several investigations and design efforts for the UI dev team. We use these flows to work through how we shape the product to use-cases and design the new addition.

There are three types of UX flows today:

1. The [bug and feature request flow] when it needs UX attention before development can act on it
    * The ticket gets attention from the UX team after normal [triage]
    * When the UX team has made a decision it will return to developers
    * Decision-making can be made through collaboration with SMEs or external individuals that have domain knowledge
2. [UX feature design effort](#ux-only-flow) for [larger feature efforts]
3. [An internal UX flow](#ux-only-flow)

## UX Only Flow

This flow is used when there is no reliance on a direct developer follow up. For those flows, see the [bug and feature request flow].

![uxInternalFlow.png](meta%2FuxInternalFlow.png)

This flow assists in both internal flows and flows to fit the [larger feature efforts].

A larger feature effort flow:

- UX creates an issue via their [internal UX template]
  - If this is for feature work, you'll need to do one more step and link it to your related feature Tracker
      > Note: If the issue is not mentioned in the tracker, artifacts associated to this effort will likely be hidden from easy access.
- Change the status from `Untriaged` to `UX Backlog` and skip the [triage] team
  - If this is accidentally missed, the Triage team will move it along
- Process continues as the UX flows need until the ticket is completed and then it is closed

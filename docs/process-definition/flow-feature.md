[SMEs]: ../smes.md#dashboard-feature-areas
[incubation]: incubation.md
[branches]: branches.md
[stability & merging back ot `main`]: branches.md#how-to-determine-it-is-stable
[development based effort]: tech-debt.md
[Advisors]: advisors.md
[UX Flow]: flow-ux.md

# Feature Process Flow

When we need to create a larger group of work, we'll need an issue called a "Tracker". Trackers offer up a grouping above a single issue, as to serve as a tracker of the issues related to a goal. All tracker work is tied to a feature branch `f/...` - this is to help with [incubation].

Often times this is a new feature to the Dashboard, including issues broken down into bite-sized development tasks. These may come in issues like "create the table", "add filters to the table", "create empty state", etc. These issues also contain UX related endeavours, such as a design task to determine the UX flow.

## The Overall Flow

![featureFlow.png](meta%2FfeatureFlow.png)

There are three types of flows part of this process:

- The [Tracker Flow](#tracker-flow)
- The [Story Flow](#story-flow)
- The [UX Flow] (not detailed above)

### Tracker Flow

Every feature needs a big tracking issue that helps drive unified goals and a status of where we are at with the feature.

![featureTrackerFlow.png](meta%2FfeatureTrackerFlow.png)

Notes:

- Dev or UI create the tracker as needed (typically its the [Advisors] or a [Feature Lead](#feature-leads))
- Once it gets into the `Trackers` status we can start
- Design effort happens through the [UX Flow]
- Development effort happens through the [Story flow](#story-flow)
- Typically all stories & ux tickets are closed before a feature is ready for [incubation]
- Post incubation leads us to merge back into `main`
  - Read more about [branches]
  - Read more about [stability & merging back ot `main`]

### Story Flow

The Dev "bite-sized" efforts to completing the larger task.

![featureStoryFlow.png](meta%2FfeatureStoryFlow.png)

Notes:

- Stories are created and moved to `Dev To Do`
- They are picked up by the feature lead or others that are helping out
- The work is completed and merged into the feature branch associated with the [Tracker](#tracker-flow)
- Stories are then manually closed (until we can get automation to do this)

When creating Stories, it is good to note some edges of the effort:

- Stories are created usually in decently large number depending on the size of the feature
- Each story has an object and drives home a specific part
- Stories can be partial aspects of pages, but are typically sized in such a way they can be worked on concurrently
  - Stories can be as simple as "build table", "add filtering to the table", and "add actions to the table"
  - These are dependant on each other, but once the table is done they can be concurrent
- Stories are created to usually fit the [UX Flow]

## Feature Leads

The leaders and to be [SMEs] of the feature. They determine the flow needed to complete the objective.

There is always at least 1 Lead, most times 2. There is not really a limit to the number of leads, but it is typically 1 or 2 main, and then backups/additional resources helping out.

If there is 1 lead, it is typically a [development based effort](tech-debt.md).

If there are 2 leads, it is often 1 UX and 1 UI lead.

- The UX Lead would be in charge of figuring out the flow and the eventual UX designs that drive the UI feature
  - This is done through the [UX Flow]
- The UI Lead would be in charge with determining the technical requirements and working with the UX Lead to make sure the flow can work out when we go to development
  - If a new tech is involved, the UI Lead would be in charge of understanding the impact
  - UI Leads do not have to be [Advisors], but if it is not an Advisor, there will be one that shadows to assist with the architecture

# Triaging

Primarily all tickets are triaged and added to our [ODH Dashboard Planning project view](https://github.com/orgs/opendatahub-io/projects/24) to help keep track of everything.

## Triage Steps

Each ticket that is logged should come with an `untriaged` label ([live filter](https://github.com/opendatahub-io/odh-dashboard/issues?q=is%3Aissue+is%3Aopen+label%3Auntriaged)). This means they need to be triaged to figure out what part of the product they will be part of, how important the change is, and what kind of issue it is.

Remove the `untriaged` label once you cover the following steps.

### (1) Labels

We typically have 3-5 labels per ticket. They consistent of the type of ticket (kind), the part of product (feature) and the need of the change (priority). 

#### What Kind of Ticket

Typically this is decided at the time of creation, but `kind/*` labels are to specify what impact they have on the product.

- `kind/bug` is for when we failed to make a flow work correctly -- this could be classified through one of these ways:
    - A UX bug -- a flow that "works" but is not sound for the user
    - A Functionality bug -- the feature does not work as originally intended
    - A Performance bug -- notable performance issues that prevent the user from having a nominal experience using the app
- `kind/enhancement` is for when the product could be expanded into a new area or add new functionality that does exist currently

If the ticket does not match the given section, we should override it and change the ticket that was logged.

There is also `kind/documentation` that we can add to sub-qualify the kind of ticket. Typically documentation issues are also either a bug or an enhancement -- although we usually do not have a lot of internal documentation.

#### What Part of the Product

Every ticket is part of some part of the product. We treat each of these areas even after the feature to help keep track of tickets.

- `feature/*` labels tracks our major features -- can match multiple of these if needed (see the description of the label for more information)
- `infrastructure` label is for when it does not match one of our features or mainly deals with an infrastructure based item (dependencies, react-router, etc)

#### What Priority is the Issue

Every ticket should have a priority -- basic rules for priority are our immediate understanding of the need. This can evolve over time but basically should cover the importance to the user or a downstream consumer of ODH.

Take a look at [the priority labels](https://github.com/opendatahub-io/odh-dashboard/labels?q=priority) to read the description.

#### Other labels

Any other labels are used for additional filtering of the ticket. They are optional and should be used when necessary by reading the description and applying to that use-case.

### (2) Project

All tickets belong to the [ODH Dashboard Planning](https://github.com/orgs/opendatahub-io/projects/24) project board. This helps us track the issues and flag them for others to find and work on. Typically all PRs are associated to this one project.

Note: PRs themselves do not belong to the project -- in the case of no ticket, you should create a ticket and add it to the board for the user.

### (3) Release

See the [release planning](./releases.md) document for more information. But basically this field is filled in when we have a desire to complete the ticket within' that release -- which is typically 3 weeks long; see the release milestone for the deadline.

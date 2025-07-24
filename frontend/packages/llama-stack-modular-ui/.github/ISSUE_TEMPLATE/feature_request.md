name: Feature request
description: Suggest an idea for this project.
title: "[Feature Request]: "
labels: ["kind/enhancement", "priority/normal", "untriaged"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this feature request! Please, fill this form to help us improve the project.
  - type: textarea
    id: description
    attributes:
      label: Feature description
      description: A clear and concise description of what you want to happen.
    validations:
      required: true
  - type: textarea
    id: describe-alternatives
    attributes:
      label: Describe alternatives you've considered
      description: A clear and concise description of any alternative solutions or features you've considered.
      placeholder: Tell us about alternatives you've considered...
    validations:
      required: false
  - type: textarea
    attributes:
      label: Anything else?
      description: |
        Links? References? Add any other context or screenshots about the feature request here.

        Tip: You can attach images or log files by clicking this area to highlight it and then dragging files in.
    validations:
      required: false
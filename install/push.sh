#!/usr/bin/env bash
printf "\n\n######## push ########\n"

echo "Pushing ${IMAGE_REPOSITORY}"
${CONTAINER_BUILDER} push ${IMAGE_REPOSITORY}

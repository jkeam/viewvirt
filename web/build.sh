#!/bin/bash

npm install
npm run clean
npm run build
podman build -t quay.io/jkeam/viewvirt -f ./Dockerfile . && podman push quay.io/jkeam/viewvirt

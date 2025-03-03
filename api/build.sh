#!/bin/bash

podman build -t quay.io/jkeam/viewvirt -f ./Dockerfile . && podman push quay.io/jkeam/viewvirt

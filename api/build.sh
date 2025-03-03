#!/bin/bash

podman build -t quay.io/jkeam/viewvirt-api -f ./Dockerfile . && podman push quay.io/jkeam/viewvirt-api

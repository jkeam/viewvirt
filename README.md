# ViewVirt

Viewer for KubeVirt.

## Development

### Prerequisites

1. Python v3.12
2. Node v24

### Backend

```shell
cd api

# install deps
pip install -r ./requirements.txt

# run dev server
#   must be logged into the cluster with permissions to manage VMs
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Frontend

```shell
cd ./web

# install deps
npm install

# run dev server
API_BASE_URL=http://127.0.0.1:8080 npm run dev
```

## Build

### Backend

```shell
cd api
./build.sh
```

### Frontend

```shell
cd web
./build.sh
```

## Deploy

1. Update `./openshift/console-link.yaml` with your domain name
2. Optionally, update the secret value in `./openshift/kustomization.yaml`

```shell
# will deploy into viewvirt namespace unless you update kustomization.yaml and namespace.yaml
oc apply -k ./openshift

# add yourself to this group
oc adm groups add-users viewvirt-users $(oc whoami)
# verify: oc get groups viewvirt-users
# remember that cluster-admins get wildcard access to everything, which includes this app

# When you remove a user from viewvirt-users, they'll lose access within 2 minutes
# oc adm groups remove-users viewvirt-users <YOUR_USER>
```

## Undeploy

```shell
oc delete -k ./openshift
```

## Links

1. [PatternFly Docs](https://www.patternfly.org/topology/getting-started)
2. [Python Kube Client](https://github.com/kubernetes-client/python)

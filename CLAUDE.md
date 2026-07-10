# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ViewVirt is a web-based viewer for KubeVirt virtual machines on OpenShift/Kubernetes. The application has a Python FastAPI backend and a React frontend using PatternFly components.

**Architecture**: 
- Backend (Python/FastAPI): Interfaces with Kubernetes API to manage KubeVirt VirtualMachines and VirtualMachineInstances
- Frontend (React/Vite): Server-side rendered React app using vite-express, communicates with backend via proxy
- Deployment: Containerized services deployed to OpenShift via Kustomize

## Development Setup

### Prerequisites
- Python 3.12
- Node.js v24
- Must be logged into an OpenShift/Kubernetes cluster with permissions to manage KubeVirt VMs

### Backend Development

```shell
cd api

# Install dependencies
pip install -r ./requirements.txt

# Run development server (requires cluster auth)
uvicorn main:app --host 0.0.0.0 --port 8080
```

The backend automatically tries to load in-cluster config first, then falls back to local kubeconfig (~/.kube/config).

### Frontend Development

```shell
cd web

# Install dependencies
npm install

# Run development server (proxies API calls to backend)
API_BASE_URL=http://127.0.0.1:8080 npm run dev
```

Frontend dev server runs on port 3000 via vite-express. The Express middleware proxies `/api/*` requests to the FastAPI backend.

### Linting

```shell
cd web
npm run lint
```

## Build & Deploy

### Build Containers

```shell
# Backend
cd api
./build.sh

# Frontend
cd web
./build.sh
```

Each build script creates a container image. Check the scripts for the image names/tags.

### Deploy to OpenShift

```shell
# Deploy to 'viewvirt' namespace (default)
oc apply -k ./openshift

# Delete deployment
oc delete -k ./openshift
```

Deployment includes:
- API deployment (FastAPI backend)
- Web deployment (Express/React frontend)
- RBAC configuration for accessing VirtualMachines
- ConsoleLink for OpenShift console integration

To change the namespace, update `openshift/kustomization.yaml` and `openshift/namespace.yaml`.

## Code Architecture

### Backend (api/main.py)

Single-file FastAPI application with the following structure:

**KubeVirt Resource Management**:
- Uses Kubernetes Python client with CustomObjectsApi for KubeVirt CRDs
- Key resource types: `virtualmachines` (persistent VM definitions), `virtualmachineinstances` (running VMs), `datavolumes` (storage)
- VM lifecycle: Managed via `runStrategy` field (`Always`, `Manual`, `Halted`) or deprecated `running` boolean

**API Endpoints**:
- `GET /vms` - Lists all VMs with their status, merging VirtualMachine and VirtualMachineInstance data
- `POST /vms` - Creates a new VirtualMachine from spec
- `POST /vms/{namespace}/{name}/start|stop|restart` - Lifecycle operations (patches `runStrategy`)
- `DELETE /vms/{namespace}/{name}` - Deletes VM
- `GET /vms/{namespace}/{name}/vnc` - Returns VNC connection info
- `GET /hosts` - Lists cluster nodes where VMs can run
- `GET /storages` - Lists StorageClasses
- `GET /datasources` - Lists DataSources (bootable volumes)
- `GET /vmnamespaces` - Lists namespaces containing VMs

### Frontend (web/src)

**Server** (`src/server/main.js`):
- Express server with vite-express integration
- Proxies `/api/*` requests to Python backend (configured via `API_BASE_URL` env var)
- Serves the React SPA

**Client** (`src/client`):
- **State Management**: Jotai atoms in `utils/store.js` (darkMode, VMs, hosts, storages, etc.)
- **API Layer**: `utils/api.js` wraps fetch calls to Express proxy endpoints
- **Routing**: React Router with routes in `main.jsx`
- **Components**:
  - `components/vms/` - VM list, VM details, VM creation form
  - `components/nodes/Host.jsx` - Node/host management
  - `components/storages/Storage.jsx` - Storage management
  - `components/networks/Network.jsx` - Network management
  - `components/nav/` - Sidebar and Header navigation
  - `components/common/` - Shared UI components

**Styling**: PatternFly v6 React components with dark mode support

## Testing

No test suite currently exists. When adding tests:
- Backend: Use pytest with pytest-asyncio for FastAPI endpoints
- Frontend: Use Vitest (already configured via Vite)

## Important Notes

- The backend requires active cluster authentication. If API calls fail with auth errors, verify `oc login` or kubeconfig is valid.
- VM lifecycle operations modify the `spec.runStrategy` field, not the deprecated `spec.running` field.
- The frontend server proxies API calls to avoid CORS issues during development.
- DataVolumes are used for VM boot disks and are managed separately from the VM lifecycle.
- VNC access requires the VirtualMachineInstance to be running and expose a VNC subresource.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Home from './components/Home.jsx';
import Vm from './components/vms/Vm.jsx';
import VmCreate from './components/vms/VmCreate.jsx';
import VmDetail from './components/vms/VmDetail.jsx';
import Host from './components/nodes/Host.jsx';
import Storage from './components/storages/Storage.jsx';
import Network from './components/networks/Network.jsx';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App title="Home" subtitle="Dashboard"><Home /></App>,
  }, {
    path: "/hosts",
    element: <App title="Hosts" subtitle="Host Detail"><Host /></App>,
  }, {
    path: "/vms",
    element: <App title="Virtual Machines" subtitle="VMs"><Vm /></App>,
  }, {
    path: "/vms/create",
    element: <App title="Create Virtual Machine" subtitle="New VM"><VmCreate /></App>,
  }, {
    path: "/vms/ns/:namespace",
    element: <App title="Virtual Machines" subtitle="VMs"><Vm /></App>,
  }, {
    path: "/vms/:namespace/:name",
    element: <App title="Virtual Machine Details" subtitle="VM Information"><VmDetail /></App>,
  }, {
    path: "/storages",
    element: <App title="Storage" subtitle="Storage Detail"><Storage /></App>,
  }, {
    path: "/networks",
    element: <App title="Network" subtitle="Network Detail"><Network /></App>,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

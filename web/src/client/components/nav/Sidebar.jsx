import React from 'react';
import {
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  Nav,
  NavList,
  NavItem,
  PageSidebar,
  PageSidebarBody
} from '@patternfly/react-core';

export default function Sidebar() {
  const navigate = useNavigate();
  const route = useLocation();
  const onSelect = ({ to }) => navigate(to);
  const pageNav = (
    <Nav onSelect={onSelect} aria-label="Nav">
      <NavList>
        <NavItem isActive={route.pathname === '/'} to="/">
          Home
        </NavItem>
        <NavItem isActive={/^\/vms\/?.*$/.test(route.pathname)} to="/vms">
          Virtual Machines
        </NavItem>
        <NavItem isActive={route.pathname === '/storages'} to="/storages">
          Storage
        </NavItem>
        <NavItem isActive={route.pathname === '/networks'} to="/networks">
          Network
        </NavItem>
        <NavItem isActive={route.pathname === '/hosts'} to="/hosts">
          Hosts
        </NavItem>
      </NavList>
    </Nav>
  );
  return (
    <PageSidebar>
      <PageSidebarBody>{pageNav}</PageSidebarBody>
    </PageSidebar>
  );
}

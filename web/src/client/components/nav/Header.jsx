import React from 'react';
import { useAtom } from 'jotai';
import {
  Brand,
  Masthead,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  MastheadBrand,
  MastheadContent,
  PageToggleButton,
  Switch,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup
} from '@patternfly/react-core';
import BarsIcon from '@patternfly/react-icons/dist/esm/icons/bars-icon';
import MoonIcon from '@patternfly/react-icons/dist/esm/icons/moon-icon';
import SunIcon from '@patternfly/react-icons/dist/esm/icons/sun-icon';
import logo from '../../assets/logo.svg';
import { darkModeAtom } from '../../utils/store.js';

export default function Header() {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);

  return (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Global navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand data-codemods>
          <MastheadLogo>
            <Brand src={logo} alt="Logo" heights={{ default: '36px' }} />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight isStatic>
          <ToolbarContent>
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>
                <Switch
                  id="dark-mode-switch"
                  label={<SunIcon />}
                  labelOff={<MoonIcon />}
                  isChecked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
}

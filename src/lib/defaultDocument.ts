import type { CanvasDocument } from '../types/document';

export const defaultDocument: CanvasDocument = {
  version: 1,
  name: 'Untitled',
  platform: 'iOS',
  minimumOS: '26.0',
  activeScreenId: 'screen-home',
  screens: [
    {
      id: 'screen-home',
      name: 'Home',
      navigationTitle: 'Home',
      root: {
        id: 'root-home',
        kind: 'vstack',
        spacing: 16,
        children: [
          {
            id: 'welcome-title',
            kind: 'text',
            text: 'Build with structure.',
            fontSize: 28,
            weight: 'semibold',
          },
          {
            id: 'welcome-body',
            kind: 'text',
            text: 'Place a component from the left panel.',
            fontSize: 17,
            weight: 'regular',
          },
          {
            id: 'welcome-button',
            kind: 'button',
            label: 'Continue',
            role: 'normal',
            minHeight: 44,
          },
          {
            id: 'settings-link',
            kind: 'navigation-link',
            label: 'Explore settings',
            destinationScreenId: 'screen-settings',
            minHeight: 44,
          },
        ],
      },
    },
    {
      id: 'screen-settings',
      name: 'Settings',
      navigationTitle: 'Settings',
      root: {
        id: 'root-settings',
        kind: 'vstack',
        spacing: 16,
        children: [
          {
            id: 'settings-form',
            kind: 'form',
            children: [
              {
                id: 'notifications-toggle',
                kind: 'toggle',
                label: 'Notifications',
                binding: 'notificationsEnabled',
                minHeight: 44,
              },
              {
                id: 'account-field',
                kind: 'textfield',
                label: 'Account name',
                binding: 'accountName',
                minHeight: 44,
              },
            ],
          },
        ],
      },
    },
  ],
};

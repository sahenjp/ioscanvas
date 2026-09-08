import type { CanvasDocument } from '../types/document';

export const defaultDocument: CanvasDocument = {
  version: 1,
  name: '新規プロジェクト',
  platform: 'iOS',
  minimumOS: '26.0',
  appearance: {
    colorScheme: 'system',
    accentColor: 'blue',
    fontDesign: 'default',
  },
  activeScreenId: 'screen-home',
  screens: [
    {
      id: 'screen-home',
      name: 'ホーム',
      navigationTitle: 'ホーム',
      root: {
        id: 'root-home',
        kind: 'vstack',
        spacing: 16,
        children: [
          {
            id: 'home-symbol',
            kind: 'image',
            systemName: 'house.fill',
            accessibilityLabel: 'ホーム',
          },
          {
            id: 'welcome-title',
            kind: 'text',
            text: 'はじめてのユーザーへ',
            fontSize: 28,
            weight: 'semibold',
            textStyle: 'title',
          },
          {
            id: 'welcome-body',
            kind: 'text',
            text: 'このアプリはSwiftUIの一例です。',
            fontSize: 17,
            weight: 'regular',
            textStyle: 'body',
          },
          {
            id: 'welcome-button',
            kind: 'button',
            label: '続ける',
            systemName: 'arrow.right',
            role: 'normal',
            minHeight: 44,
            glass: 'prominent',
            glassTint: 'blue',
            glassInteractive: true,
          },
          {
            id: 'settings-link',
            kind: 'navigation-link',
            label: '設定を開く',
            destinationScreenId: 'screen-settings',
            minHeight: 44,
            glass: 'clear',
            glassInteractive: true,
          },
        ],
      },
    },
    {
      id: 'screen-settings',
      name: '設定',
      navigationTitle: '設定',
      root: {
        id: 'root-settings',
        kind: 'vstack',
        spacing: 16,
        children: [
            {
              id: 'settings-form',
              kind: 'form',
              glass: 'regular',
              children: [
              {
                id: 'notifications-toggle',
                kind: 'toggle',
                label: '通知',
                binding: 'notificationsEnabled',
                minHeight: 44,
              },
              {
                id: 'account-field',
                kind: 'textfield',
                label: 'アカウント名',
                binding: 'accountName',
                minHeight: 44,
              },
              {
                id: 'accent-color',
                kind: 'colorpicker',
                label: 'アクセントカラー',
                binding: 'accentColor',
                color: '#007AFF',
                minHeight: 44,
              },
            ],
          },
        ],
      },
    },
  ],
};

import type { CanvasDocument, CanvasNode } from '../types/document';

export type LintSeverity = 'warning' | 'info';

export interface LintIssue {
  nodeId: string;
  severity: LintSeverity;
  code:
    | 'HIT_TARGET'
    | 'TEXT_SIZE'
    | 'DYNAMIC_TYPE'
    | 'EMPTY_LABEL'
    | 'EMPTY_SECTION'
    | 'EMPTY_SHEET'
    | 'FIXED_HEIGHT'
    | 'NAVIGATION_STRUCTURE'
    | 'NAVIGATION_DESTINATION'
    | 'ACCESSIBILITY';
  message: string;
}

function lintNode(
  node: CanvasNode,
  issues: LintIssue[],
  screenIds: Set<string>,
  screenId: string,
  parentKind?: CanvasNode['kind'],
  isScreenRootChild = false,
): void {
  if (parentKind === 'scrollview' && (node.kind === 'list' || node.kind === 'form')) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'NAVIGATION_STRUCTURE',
      message: `${node.kind === 'list' ? 'List' : 'Form'}をScrollViewの中に入れています。二重スクロールにならない構造へ見直してください。`,
    });
  }

  if ((parentKind === 'list' || parentKind === 'form') && node.kind === 'scrollview') {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'NAVIGATION_STRUCTURE',
      message: 'ScrollViewをListまたはFormの中に入れています。スクロール領域を一つにまとめてください。',
    });
  }

  if (node.kind === 'navigation-split-view' && !isScreenRootChild) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'NAVIGATION_STRUCTURE',
      message: 'NavigationSplitViewは画面のルートに置いてください。別のScrollViewやNavigationStackの中ではiPadの列構造が崩れる可能性があります。',
    });
  }

  if (node.kind === 'button' || node.kind === 'alert' || node.kind === 'confirmation-dialog' || node.kind === 'toggle' || node.kind === 'textfield' || node.kind === 'searchfield' || node.kind === 'securefield' || node.kind === 'texteditor' || node.kind === 'picker' || node.kind === 'colorpicker' || node.kind === 'slider' || node.kind === 'stepper' || node.kind === 'menu' || node.kind === 'navigation-link' || node.kind === 'link' || node.kind === 'datepicker') {
    if (node.minHeight < 44) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'HIT_TARGET',
        message: '操作領域は44pt以上を推奨します。',
      });
    }
    if (node.minHeight > 88) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'FIXED_HEIGHT',
        message: '固定高さが大きく、Dynamic Typeや内容の折り返しを妨げる可能性があります。',
      });
    }
    const accessibleName = node.kind === 'button' ? node.accessibilityLabel?.trim() : undefined;
    if (node.label.trim().length === 0 && !accessibleName) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'EMPTY_LABEL',
        message: '操作要素には表示ラベルとVoiceOverで理解できる名前を付けてください。',
      });
    }
  }

  if (node.kind === 'progress' && node.label.trim().length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'ProgressViewには進行状況の意味が伝わるラベルを付けてください。',
    });
  }

  if (node.kind === 'gauge' && node.label.trim().length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'Gaugeには値の意味が伝わるラベルを付けてください。',
    });
  }

  if (node.kind === 'content-unavailable' && (node.title.trim().length === 0 || node.systemName.trim().length === 0)) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: '空状態には意味のあるタイトルとSF Symbolを指定してください。',
    });
  }

  if (node.kind === 'sheet' && (!node.label || node.label.trim().length === 0)) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'EMPTY_LABEL',
      message: 'Sheetを開く操作には表示ラベルとVoiceOverで理解できる名前を付けてください。',
    });
  }

  if (node.kind === 'alert' && (node.title.trim().length === 0 || node.primaryButton.trim().length === 0)) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'Alertには内容を説明するタイトルと、意味のある主要アクションを指定してください。',
    });
  }

  if (node.kind === 'confirmation-dialog' && (node.title.trim().length === 0 || node.options.every((option) => option.trim().length === 0))) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'ConfirmationDialogには内容を説明するタイトルと、意味のある選択肢を指定してください。',
    });
  }

  if (node.kind === 'label' && (node.title.trim().length === 0 || node.systemName.trim().length === 0)) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'Labelには意味のあるタイトルとSF Symbolを指定してください。',
    });
  }

  if (node.kind === 'link') {
    try {
      if (!node.url.trim() || !/^https?:$/i.test(new URL(node.url).protocol)) throw new Error('Invalid URL');
    } catch {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'ACCESSIBILITY',
        message: 'Linkには有効なhttpまたはhttpsのURLを指定してください。',
      });
    }
  }

  const destinationScreenId = node.kind === 'navigation-link' || node.kind === 'button'
    ? node.destinationScreenId
    : undefined;
  if (destinationScreenId !== undefined && !screenIds.has(destinationScreenId)) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'NAVIGATION_DESTINATION',
      message: `${node.kind === 'button' ? 'Button' : 'NavigationLink'}の遷移先画面が未設定です。実装時に表示する画面を指定してください。`,
    });
  } else if (destinationScreenId === screenId) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'NAVIGATION_STRUCTURE',
      message: `${node.kind === 'button' ? 'Button' : 'NavigationLink'}が現在の画面自身を遷移先にしています。意図しないNavigationStackの積み重ねにならないか確認してください。`,
    });
  }

  if (node.kind === 'text') {
    if (node.fontSize < 11) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'TEXT_SIZE',
        message: 'テキストは11pt以上を推奨します。',
      });
    }
    if (!node.textStyle || node.textStyle === 'custom') {
      issues.push({
        nodeId: node.id,
        severity: 'info',
        code: 'DYNAMIC_TYPE',
        message: '固定サイズのフォントはDynamic Typeで拡大されない可能性があります。システムテキストスタイルを検討してください。',
      });
    }
    if (node.lineLimit !== undefined) {
      issues.push({
        nodeId: node.id,
        severity: 'info',
        code: 'DYNAMIC_TYPE',
        message: `最大${node.lineLimit}行に制限しています。Dynamic Typeで内容が切れないか確認してください。`,
      });
    }
  }

  if (node.kind === 'image' && node.systemName.trim().length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: `${node.source === 'remote' ? 'リモート画像のURL' : node.source === 'asset' ? '画像アセット名' : 'ImageのSF Symbol名'}が空です。表示する意味のある画像を指定してください。`,
    });
  }

  if (node.kind === 'image' && node.source === 'remote') {
    try {
      if (!/^https?:$/i.test(new URL(node.systemName).protocol)) throw new Error('Invalid image URL');
    } catch {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'ACCESSIBILITY',
        message: 'リモートImageには有効なhttpまたはhttpsのURLを指定してください。',
      });
    }
  }

  if (node.kind === 'section' || node.kind === 'disclosure-group') {
    if (!node.title?.trim()) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'ACCESSIBILITY',
        message: `${node.kind === 'section' ? 'Section' : 'DisclosureGroup'}の見出しが空です。内容を説明するタイトルを指定してください。`,
      });
    }
    if (node.children.length === 0) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'EMPTY_SECTION',
        message: `${node.kind === 'section' ? 'Section' : 'DisclosureGroup'}に表示する子要素がありません。`,
      });
    }
    if (node.kind === 'section' && node.children.length > 0) {
      issues.push({
        nodeId: node.id,
        severity: 'info',
        code: 'NAVIGATION_STRUCTURE',
        message: 'Sectionは生成コードではScrollView内に配置されます。ListまたはFormが必要か確認してください。',
      });
    }
  }

  if (node.kind === 'sheet' && node.children.length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'EMPTY_SHEET',
      message: 'Sheetに表示する内容がありません。EmptyView()ではなく、実際のモーダル内容を追加してください。',
    });
  }

  if (node.kind === 'groupbox' && (!node.title || node.title.trim().length === 0)) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'GroupBoxには内容を説明する見出しを指定してください。',
    });
  }

  if (node.kind === 'tabview' && node.children.length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'EMPTY_SECTION',
      message: 'TabViewに表示するタブがありません。少なくとも1つのタブを追加してください。',
    });
  }

  if (node.kind === 'navigation-split-view' && node.children.length < 2) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'EMPTY_SECTION',
      message: 'NavigationSplitViewにはサイドバーと詳細画面の両方を追加してください。',
    });
  }

  if (node.kind === 'navigation-split-view' && node.children.length > 2) {
    issues.push({
      nodeId: node.id,
      severity: 'info',
      code: 'NAVIGATION_STRUCTURE',
      message: 'NavigationSplitViewの3つ目以降の要素は詳細側のVStackにまとめて生成されます。',
    });
  }

  if (node.kind === 'hstack' || node.kind === 'lazyhstack') {
    const controls = node.children.filter((child) =>
      child.kind === 'button' || child.kind === 'alert' || child.kind === 'confirmation-dialog' || child.kind === 'toggle' || child.kind === 'textfield' || child.kind === 'searchfield' || child.kind === 'securefield' || child.kind === 'texteditor' || child.kind === 'picker' || child.kind === 'slider' || child.kind === 'stepper' || child.kind === 'menu',
    );
    if (controls.length > 1 && (node.spacing ?? 0) < 8) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'ACCESSIBILITY',
        message: 'HStack内の操作要素が近すぎます。VoiceOver操作と44ptの操作領域が干渉しないか確認してください。',
      });
    }
  }

  node.children?.forEach((child) => lintNode(child, issues, screenIds, screenId, node.kind));
}

export function lintDocument(document: CanvasDocument): LintIssue[] {
  const issues: LintIssue[] = [];
  const screenIds = new Set(document.screens.map((screen) => screen.id));
  for (const screen of document.screens) {
    if (screen.navigationTitle.trim().length === 0) {
      issues.push({
        nodeId: screen.root.id,
        severity: 'warning',
        code: 'NAVIGATION_STRUCTURE',
        message: 'NavigationStackのタイトルが空です。画面の階層と目的が伝わるタイトルを設定してください。',
      });
    }
    for (const item of screen.toolbarItems ?? []) {
      if (item.title.trim().length === 0) {
        issues.push({
          nodeId: screen.root.id,
          severity: 'warning',
          code: 'ACCESSIBILITY',
          message: 'ツールバー項目に表示名がありません。VoiceOverで理解できるラベルを指定してください。',
        });
      }
      if (item.destinationScreenId !== undefined && !screenIds.has(item.destinationScreenId)) {
        issues.push({
          nodeId: screen.root.id,
          severity: 'warning',
          code: 'NAVIGATION_DESTINATION',
          message: 'ツールバー項目の遷移先画面が未設定です。表示する画面を指定してください。',
        });
      } else if (item.destinationScreenId === screen.id) {
        issues.push({
          nodeId: screen.root.id,
          severity: 'warning',
          code: 'NAVIGATION_STRUCTURE',
          message: 'ツールバー項目が現在の画面自身を遷移先にしています。意図しないNavigationStackの積み重ねにならないか確認してください。',
        });
      }
    }
    for (const [direction, destination] of Object.entries(screen.swipe ?? {})) {
      if (destination === screen.id) {
        issues.push({
          nodeId: screen.root.id,
          severity: 'warning',
          code: 'NAVIGATION_STRUCTURE',
          message: `${direction}方向のスワイプ遷移が現在の画面自身を指しています。無限に同じ画面を積まないか確認してください。`,
        });
      }
    }
    if (screen.root.children.length > 1) {
      screen.root.children
        .filter((node) => node.kind === 'list' || node.kind === 'form' || node.kind === 'scrollview')
        .forEach((node) => {
          issues.push({
            nodeId: node.id,
            severity: 'warning',
            code: 'NAVIGATION_STRUCTURE',
            message: `${node.kind === 'list' ? 'List' : node.kind === 'form' ? 'Form' : 'ScrollView'}を画面ルートの他の要素と併置しています。生成時のスクロール領域が意図どおりか確認してください。`,
          });
        });
    }
    screen.root.children.forEach((node) => lintNode(node, issues, screenIds, screen.id, undefined, true));
  }
  return issues;
}

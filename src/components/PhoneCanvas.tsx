import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { generateSwiftUI } from '../lib/swiftui';
import { downloadElementAsPng } from '../lib/image';
import {
  decodeDragData,
  encodeDragData,
  findNode,
  findNodeLocation,
  isContainerNode,
  NODE_DRAG_MIME,
} from '../lib/nodes';
import { useEditorStore } from '../store/editor';
import type { AlertNode, CanvasDocument, CanvasNode, CanvasScreen, ConfirmationDialogNode, ContainerNode, FontDesign, M3eItemMetadata, M3eTextColor, NavigationTransition, ScreenBackground, ScreenDevice, ScreenOrientation, SwipeDirection, TextStyle, ToolbarItem } from '../types/document';

function readDragData(event: React.DragEvent): ReturnType<typeof decodeDragData> {
  const value = event.dataTransfer.getData(NODE_DRAG_MIME) || event.dataTransfer.getData('text/plain');
  return value ? decodeDragData(value) : null;
}

function hasNodeDragData(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(NODE_DRAG_MIME) || event.dataTransfer.types.includes('text/plain');
}

type PreviewValue = boolean | number | string;
type DropPosition = 'inside' | 'before' | 'after';

interface CanvasDropTarget {
  position: DropPosition;
}

type PreviewTextScale = 'default' | 'large' | 'accessibility';

interface PreviewDevice {
  id: ScreenDevice;
  label: string;
  width: number;
  height: number;
  kind: 'phone' | 'tablet';
}

const previewDevices: PreviewDevice[] = [
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667, kind: 'phone' },
  { id: 'iphone-16', label: 'iPhone 16', width: 393, height: 852, kind: 'phone' },
  { id: 'ipad-mini', label: 'iPad mini', width: 744, height: 1133, kind: 'tablet' },
  { id: 'ipad-pro-11', label: 'iPad Pro 11″', width: 834, height: 1194, kind: 'tablet' },
];

function orientPreviewDevice(device: PreviewDevice, orientation: ScreenOrientation | undefined): PreviewDevice {
  return orientation === 'landscape'
    ? { ...device, width: device.height, height: device.width, label: `${device.label}（横向き）` }
    : device;
}

const previewTextScales: { id: PreviewTextScale; label: string; factor: number }[] = [
  { id: 'default', label: '標準文字', factor: 1 },
  { id: 'large', label: '大きい文字', factor: 1.2 },
  { id: 'accessibility', label: 'アクセシビリティ', factor: 1.55 },
];

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;

interface PreviewControls {
  value: PreviewValue;
  onChange: (value: PreviewValue) => void;
}

function NodeView({
  node,
  allNodes,
  screenId,
  onOpenSheet,
  onNavigateScreen,
  onNavigateBack,
}: {
  node: CanvasNode;
  allNodes: CanvasNode[];
  screenId: string;
  onOpenSheet?: (nodeId: string) => void;
  onNavigateScreen?: (screenId: string, transition?: NavigationTransition) => void;
  onNavigateBack?: (transition?: NavigationTransition) => void;
}) {
  const activeScreenId = useEditorStore((state) => state.document.activeScreenId);
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
  const selectNode = useEditorStore((state) => state.selectNode);
  const toggleNodeSelection = useEditorStore((state) => state.toggleNodeSelection);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const addNode = useEditorStore((state) => state.addNode);
  const addM3eNode = useEditorStore((state) => state.addM3eNode);
  const addM3eScreenPart = useEditorStore((state) => state.addM3eScreenPart);
  const addPattern = useEditorStore((state) => state.addPattern);
  const moveNode = useEditorStore((state) => state.moveNode);
  const previewMode = useEditorStore((state) => state.previewMode);
  const [dropTarget, setDropTarget] = useState<CanvasDropTarget | null>(null);
  const [previewValue, setPreviewValue] = useState<PreviewValue>(() => initialPreviewValue(node));
  const selected = !previewMode && selectedNodeIds.includes(node.id);
  const glassClass = [
    node.glass ? `glass-${node.glass}` : '',
    node.glassTint ? `glass-tint-${node.glassTint}` : '',
    node.glassInteractive ? 'glass-interactive' : '',
    node.glassShape && node.glassShape !== 'automatic' ? `glass-shape-${node.glassShape}` : '',
  ].filter(Boolean).join(' ');
  const nodeStyle = previewNodeStyle(node);
  const m3eClass = [
    node.m3eMetadata ? 'has-m3e-metadata' : '',
    node.m3eMetadata?.fill ? 'has-m3e-fill' : '',
    node.m3eMetadata?.textColor ? 'has-m3e-text-color' : '',
    node.m3eMetadata?.iconFill ? 'has-m3e-icon-fill' : '',
    m3eCornerRadius(node.m3eMetadata) ? 'has-m3e-radius' : '',
  ].filter(Boolean).join(' ');

  const select = (event: React.MouseEvent) => {
    if (previewMode) return;
    event.stopPropagation();
    selectScreen(screenId);
    if (event.shiftKey) toggleNodeSelection(node.id);
    else selectNode(node.id);
  };

  const startDrag = (event: React.DragEvent) => {
    if (previewMode) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    const value = encodeDragData({ kind: 'move', nodeId: node.id });
    event.dataTransfer.setData(NODE_DRAG_MIME, value);
    event.dataTransfer.setData('text/plain', value);
    selectScreen(screenId);
    selectNode(node.id);
  };

  const dragOver = (event: React.DragEvent) => {
    if (previewMode || !hasNodeDragData(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const data = readDragData(event);
    event.dataTransfer.dropEffect = data?.kind === 'move' ? 'move' : 'copy';
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontal = node.kind === 'hstack' || node.kind === 'lazyhstack' || node.kind === 'lazyhgrid';
    const pointer = horizontal ? event.clientX : event.clientY;
    const start = horizontal ? rect.left : rect.top;
    const size = horizontal ? rect.width : rect.height;
    const edge = Math.min(28, size / 3);
    const inside = Boolean(data && isContainerNode(node) && (data.kind !== 'move' || (pointer > start + edge && pointer < start + size - edge)));
    setDropTarget({ position: inside ? 'inside' : pointer < start + size / 2 ? 'before' : 'after' });
  };

  const drop = (event: React.DragEvent) => {
    if (previewMode) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);
    const data = readDragData(event);
    if (!data) return;

    if (data.kind === 'm3e-screen') {
      selectScreen(screenId);
      addM3eScreenPart(data.m3eKind);
      return;
    }

    if (data.kind === 'move' && activeScreenId !== screenId) return;
    if (data.kind !== 'move') selectScreen(screenId);

    if (data.kind === 'new' && isContainerNode(node)) {
      addNode(data.nodeKind, node.id);
      return;
    }

    if (data.kind === 'm3e' && isContainerNode(node)) {
      addM3eNode(data.m3eKind, node.id);
      return;
    }

    if (data.kind === 'pattern' && isContainerNode(node)) {
      addPattern(data.pattern, node.id);
      return;
    }

    const location = findNodeLocation(allNodes, node.id);
    if (!location) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontal = node.kind === 'hstack' || node.kind === 'lazyhstack' || node.kind === 'lazyhgrid';
    const pointer = horizontal ? event.clientX : event.clientY;
    const start = horizontal ? rect.left : rect.top;
    const size = horizontal ? rect.width : rect.height;
    const edge = Math.min(28, size / 3);
    const insideContainer = isContainerNode(node)
      && data.kind === 'move'
      && pointer > start + edge
      && pointer < start + size - edge;

    if (insideContainer) {
      moveNode(data.nodeId, node.id, node.children.length);
      return;
    }

    const insertBefore = pointer < start + size / 2;
    const index = location.index + (insertBefore ? 0 : 1);
    if (data.kind === 'new') addNode(data.nodeKind, location.parentId, index);
    else if (data.kind === 'm3e') addM3eNode(data.m3eKind, location.parentId, index);
    else if (data.kind === 'pattern') addPattern(data.pattern, location.parentId, index);
    else moveNode(data.nodeId, location.parentId, index);
  };

  const destinationScreenId = node.kind === 'navigation-link' || node.kind === 'button'
    ? node.destinationScreenId
    : undefined;
  const navigationAction = node.kind === 'button' ? node.navigationAction : undefined;
  const navigate = previewMode && (destinationScreenId || navigationAction === 'back')
    ? () => navigationAction === 'back'
      ? onNavigateBack?.(node.navigationTransition)
      : destinationScreenId && (onNavigateScreen ? onNavigateScreen(destinationScreenId, node.navigationTransition) : selectScreen(destinationScreenId))
    : undefined;
  const content = renderNodeContent(
    node,
    allNodes,
    screenId,
    navigate,
    previewMode ? { value: previewValue, onChange: (value) => setPreviewValue(value) } : undefined,
    onOpenSheet,
    onNavigateScreen,
    onNavigateBack,
  );

  return (
    <div
      className={`canvas-node canvas-node-layout-${node.kind} ${glassClass} ${m3eClass} ${selected ? 'is-selected' : ''} ${dropTarget ? `is-drop-target is-drop-${dropTarget.position}` : ''}`}
      draggable={!previewMode}
      onClick={previewMode ? undefined : select}
      onDragEnd={previewMode ? undefined : () => setDropTarget(null)}
      onDragEnter={previewMode ? undefined : dragOver}
      onDragLeave={previewMode ? undefined : () => setDropTarget(null)}
      onDragOver={previewMode ? undefined : dragOver}
      onDragStart={previewMode ? undefined : startDrag}
      onDrop={previewMode ? undefined : drop}
      style={nodeStyle}
    >
      {content}
    </div>
  );
}

function renderNodeContent(
  node: CanvasNode,
  allNodes: CanvasNode[],
  screenId: string,
  onNavigate?: () => void,
  controls?: PreviewControls,
  onOpenSheet?: (nodeId: string) => void,
  onNavigateScreen?: (screenId: string, transition?: NavigationTransition) => void,
  onNavigateBack?: (transition?: NavigationTransition) => void,
): React.ReactNode {
  switch (node.kind) {
    case 'text':
      if (node.m3eKind === 'badge') {
        return (
          <div className={`m3e-badge ${node.text.trim() ? 'has-text' : 'is-dot'}`} style={m3eContentStyle(node)} aria-label={node.text.trim() ? `バッジ ${node.text}` : '通知バッジ'}>
            {node.text.trim() || <span aria-hidden="true" />}
          </div>
        );
      }
      return (
        <div
          className="canvas-text"
          style={{
            fontSize: `calc(${textStyleSize(node.textStyle) ?? node.fontSize}px * var(--preview-text-scale, 1))`,
            fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 }[node.weight],
            fontFamily: fontDesignFamily(node.fontDesign),
            textAlign: node.textAlignment === 'center' ? 'center' : node.textAlignment === 'trailing' ? 'right' : 'left',
            ...(m3eTextColor(node.m3eMetadata?.textColor) ? { color: m3eTextColor(node.m3eMetadata?.textColor) } : {}),
            ...(node.lineLimit === undefined ? {} : {
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: node.lineLimit,
            }),
          }}
        >
          {node.text}
        </div>
      );
    case 'image':
      return (
        <div className="ios-image" style={m3eContentStyle(node)} role="img" aria-label={node.accessibilityLabel || undefined} title={node.systemName || undefined}>
          {node.source && node.source !== 'symbol' && node.systemName.trim() ? (
            <>
              <img className="ios-image-media" src={node.systemName} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              <span className="ios-image-symbol" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph('photo')}</span>
            </>
          ) : <span className="ios-image-symbol" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph(node.systemName)}</span>}
        </div>
      );
    case 'camera':
      return (
        <button
          className="ios-row ios-camera"
          type="button"
          style={{ minHeight: node.minHeight, ...m3eContentStyle(node) }}
          aria-label={node.label || 'カメラ'}
          onClick={controls ? (event) => event.stopPropagation() : undefined}
        >
          <span className="ios-camera-symbol" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph('camera.fill')}</span>
          <span>{node.label || 'カメラ'}</span>
          <span className="ios-link-indicator" aria-hidden="true">›</span>
        </button>
      );
    case 'map':
      return (
        <div className="ios-map" style={m3eContentStyle(node)} role="img" aria-label={node.label || '地図'}>
          <span className="ios-map-symbol" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph('map.fill')}</span>
          <strong>MapKit Map</strong>
          <span>{node.label || '地図'}</span>
        </div>
      );
    case 'button':
      {
        const toggleOn = node.toggle && controls ? controls.value === true : node.toggle?.isOn ?? false;
        const label = node.toggle && toggleOn ? node.toggle.onLabel : node.label;
        const systemName = node.toggle && toggleOn ? node.toggle.onSystemName ?? node.systemName : node.systemName;
        const trailingSystemName = node.m3eIcon2 === undefined ? node.m3eMetadata?.icon2 : node.m3eIcon2;
        const buttonStyle = node.toggle && toggleOn ? node.toggle.onButtonStyle ?? node.buttonStyle : node.buttonStyle;
        if (node.m3eKind === 'splitButton') {
          return (
            <div className="ios-split-button" role="group" aria-label={node.label || 'スプリットボタン'} style={{ minHeight: node.minHeight }}>
              <button
                type="button"
                className="ios-button ios-split-button-primary"
                style={m3eContentStyle(node)}
                onClick={onNavigate ? (event) => { event.stopPropagation(); onNavigate(); } : undefined}
              >
                {systemName && <span className="ios-button-symbol" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph(systemName)}</span>}
                <span>{label || 'Button'}</span>
                {trailingSystemName && <span className="ios-button-symbol ios-button-symbol-trailing" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph(trailingSystemName)}</span>}
              </button>
              <button type="button" className="ios-button ios-split-button-menu" style={m3eContentStyle(node)} aria-label={`${label || 'ボタン'}のメニュー`} onClick={(event) => event.stopPropagation()}>
                <span aria-hidden="true">⌄</span>
              </button>
            </div>
          );
        }
        return (
          <button
            type="button"
            className={`ios-button ${node.role === 'destructive' ? 'destructive' : ''} ${!node.glass && buttonStyle && buttonStyle !== 'automatic' ? `button-style-${buttonStyle}` : ''} ${node.glass ? `ios-button-${node.glass}` : ''} ${node.glassInteractive ? 'glass-interactive' : ''} ${node.glassTint ? `glass-tint-${node.glassTint}` : ''} ${node.toggle ? `ios-button-toggle ${toggleOn ? 'is-on' : ''}` : ''} ${node.m3eKind ? `m3e-${node.m3eKind}` : ''}`}
            style={{ minHeight: node.minHeight, ...m3eContentStyle(node) }}
            aria-label={node.accessibilityLabel || undefined}
            aria-pressed={node.toggle ? toggleOn : undefined}
            onClick={onNavigate || (node.toggle && controls) ? (event) => {
              event.stopPropagation();
              if (node.toggle && controls) controls.onChange(!toggleOn);
              onNavigate?.();
            } : undefined}
          >
            {systemName && <span className="ios-button-symbol" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph(systemName)}</span>}
            <span>{label || 'Button'}</span>
            {trailingSystemName && <span className="ios-button-symbol ios-button-symbol-trailing" style={m3eIconStyle(node)} aria-hidden="true">{symbolGlyph(trailingSystemName)}</span>}
          </button>
        );
      }
    case 'toggle':
      if (node.m3eKind === 'checkbox' || node.m3eKind === 'radio') {
        const checked = controls ? controls.value === true : node.isOn ?? false;
        const showIndicator = node.m3eMetadata?.noCheck !== true;
        return (
          <label className={`ios-choice-row m3e-${node.m3eKind}`} style={{ minHeight: 44, ...m3eContentStyle(node) }}>
            {controls && <input className="ios-choice-input" type={node.m3eKind === 'radio' ? 'radio' : 'checkbox'} checked={checked} aria-label={node.label || '選択'} onChange={() => controls.onChange(!checked)} />}
            {showIndicator && <span className="ios-choice-indicator" aria-hidden="true">{checked && (node.m3eKind === 'checkbox' ? '✓' : <span />)}</span>}
            <span>{node.label || '選択'}</span>
          </label>
        );
      }
      if (controls) {
        return (
          <label className="ios-row ios-toggle-row" style={{ minHeight: node.minHeight, ...m3eContentStyle(node) }}>
            <span>{node.label || 'Toggle'}</span>
            <input className="ios-switch-input" type="checkbox" checked={controls.value === true} onChange={(event) => controls.onChange(event.target.checked)} />
            <span className="ios-switch" aria-hidden="true"><span /></span>
          </label>
        );
      }
      return (
        <div className="ios-row" style={{ minHeight: node.minHeight, ...m3eContentStyle(node) }}>
          <span>{node.label || 'Toggle'}</span>
          <span className="ios-switch" aria-hidden="true"><span /></span>
        </div>
      );
    case 'textfield':
      if (controls) {
        return (
          <input
            className="ios-field ios-preview-input"
            type="text"
            value={stringPreviewValue(controls.value)}
            placeholder={node.label || 'Text field'}
            aria-label={node.label || 'Text field'}
            style={{ minHeight: node.minHeight }}
            onChange={(event) => controls.onChange(event.target.value)}
          />
        );
      }
      return (
        <div className="ios-field" style={{ minHeight: node.minHeight }}>
          {node.label || 'Text field'}
        </div>
      );
    case 'searchfield':
      if (controls) {
        return (
          <label className="ios-field ios-search-field" style={{ minHeight: node.minHeight }}>
            <span className="ios-search-symbol" aria-hidden="true">⌕</span>
            <input
              className="ios-preview-input"
              type="search"
              value={stringPreviewValue(controls.value)}
              placeholder={node.prompt || '検索'}
              aria-label={node.label || '検索'}
              onChange={(event) => controls.onChange(event.target.value)}
            />
          </label>
        );
      }
      return (
        <div className="ios-field ios-search-field" style={{ minHeight: node.minHeight }}>
          <span className="ios-search-symbol" aria-hidden="true">⌕</span>
          <span>{node.prompt || node.label || '検索'}</span>
        </div>
      );
    case 'securefield':
      if (controls) {
        return (
          <input
            className="ios-field ios-preview-input"
            type="password"
            value={stringPreviewValue(controls.value)}
            placeholder={node.label || 'Password'}
            aria-label={node.label || 'Password'}
            style={{ minHeight: node.minHeight }}
            onChange={(event) => controls.onChange(event.target.value)}
          />
        );
      }
      return (
        <div className="ios-field ios-secure-field" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Password'}</span><span aria-hidden="true">••••••••</span>
        </div>
      );
    case 'texteditor':
      if (controls) {
        return (
          <textarea
            className="ios-text-editor ios-preview-text-editor"
            value={stringPreviewValue(controls.value)}
            placeholder={node.label || 'Notes'}
            aria-label={node.label || 'Notes'}
            style={{ minHeight: node.minHeight }}
            onChange={(event) => controls.onChange(event.target.value)}
          />
        );
      }
      return (
        <div className="ios-text-editor" style={{ minHeight: node.minHeight }}>
          <span className="ios-text-editor-label">{node.label || 'Notes'}</span>
          <span className="ios-text-editor-placeholder">入力内容</span>
        </div>
      );
    case 'picker':
      if (controls) {
        return (
          <label className="ios-row ios-picker" style={{ minHeight: node.minHeight }}>
            <span>{node.label || 'Selection'}</span>
            <select className="ios-preview-select" value={stringPreviewValue(controls.value)} aria-label={node.label || 'Selection'} onChange={(event) => controls.onChange(event.target.value)}>
              {node.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        );
      }
      return (
        <div className="ios-row ios-picker" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Selection'}</span>
          <span className="ios-picker-value">{node.options[0]} <span aria-hidden="true">⌄</span></span>
        </div>
      );
    case 'colorpicker':
      if (controls) {
        return (
          <label className="ios-row ios-color-picker" style={{ minHeight: node.minHeight }}>
            <span>{node.label || 'Color'}</span>
            <input
              className="ios-preview-color"
              type="color"
              value={colorPreviewValue(controls.value, node.color)}
              aria-label={node.label || 'Color'}
              onChange={(event) => controls.onChange(event.target.value)}
            />
          </label>
        );
      }
      return (
        <div className="ios-row ios-color-picker" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Color'}</span>
          <span className="ios-color-swatch" style={{ backgroundColor: node.color }} aria-label={node.color} />
        </div>
      );
    case 'slider': {
      const percent = ((node.value - node.minimum) / (node.maximum - node.minimum)) * 100;
      if (controls) {
        const value = numberPreviewValue(controls.value, node.value);
        const previewPercent = ((value - node.minimum) / (node.maximum - node.minimum)) * 100;
        return (
          <div className="ios-slider" style={{ minHeight: node.minHeight }}>
            <div className="ios-slider-header"><span>{node.label || 'Value'}</span><span>{value}</span></div>
            <input className="ios-preview-range" type="range" min={node.minimum} max={node.maximum} step={node.step} value={value} aria-label={node.label || 'Value'} onChange={(event) => controls.onChange(Number(event.target.value))} />
            <div className="ios-slider-track"><span style={{ width: `${Math.max(0, Math.min(100, previewPercent))}%` }} /><i style={{ left: `${Math.max(0, Math.min(100, previewPercent))}%` }} aria-hidden="true" /></div>
          </div>
        );
      }
      return (
        <div className="ios-slider" style={{ minHeight: node.minHeight }}>
          <div className="ios-slider-header"><span>{node.label || 'Value'}</span><span>{node.value}</span></div>
          <div className="ios-slider-track"><span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /><i style={{ left: `${Math.max(0, Math.min(100, percent))}%` }} aria-hidden="true" /></div>
        </div>
      );
    }
    case 'stepper':
      if (controls) {
        const value = numberPreviewValue(controls.value, node.value);
        return (
          <div className="ios-row ios-stepper" style={{ minHeight: node.minHeight }}>
            <span>{node.label || 'Quantity'}</span>
            <span className="ios-stepper-control">
              <button type="button" aria-label="減らす" disabled={value <= node.minimum} onClick={(event) => { event.stopPropagation(); controls.onChange(Math.max(node.minimum, value - node.step)); }}>−</button>
              <strong>{value}</strong>
              <button type="button" aria-label="増やす" disabled={value >= node.maximum} onClick={(event) => { event.stopPropagation(); controls.onChange(Math.min(node.maximum, value + node.step)); }}>＋</button>
            </span>
          </div>
        );
      }
      return (
        <div className="ios-row ios-stepper" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Quantity'}</span>
          <span className="ios-stepper-control"><button type="button" aria-label="減らす">−</button><strong>{node.value}</strong><button type="button" aria-label="増やす">＋</button></span>
        </div>
      );
    case 'menu':
      if (controls) {
        return (
          <label className="ios-row ios-menu" style={{ minHeight: node.minHeight }}>
            <span>{node.label || 'Actions'}</span>
            <select className="ios-preview-select" value={stringPreviewValue(controls.value)} aria-label={node.label || 'Actions'} onChange={(event) => controls.onChange(event.target.value)}>
              {node.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        );
      }
      return (
        <div className="ios-row ios-menu" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Actions'}</span><span className="ios-picker-value" aria-hidden="true">⌄</span>
        </div>
      );
    case 'progress': {
      const percent = Math.max(0, Math.min(100, node.value * 100));
      const thickness = node.trackThickness ?? 4;
      const progressClass = ['ios-progress', node.style === 'circular' ? 'is-circular' : '', node.wavy ? 'is-wavy' : ''].filter(Boolean).join(' ');
      if (node.style === 'circular') {
        return (
          <div className={progressClass} aria-label={node.label || 'Progress'} aria-busy={node.indeterminate || undefined}>
            <div className="ios-progress-label"><span>{node.label || 'Progress'}</span><span>{node.indeterminate ? '読み込み中' : `${Math.round(percent)}%`}</span></div>
            <div className="ios-progress-ring" style={{ '--progress': `${percent}%`, '--track-thickness': `${thickness}px` } as CSSProperties}>
              <span aria-hidden="true">{node.indeterminate ? '…' : `${Math.round(percent)}%`}</span>
            </div>
          </div>
        );
      }
      return (
        <div className={progressClass} aria-label={node.label || 'Progress'} aria-busy={node.indeterminate || undefined}>
          <div className="ios-progress-label"><span>{node.label || 'Progress'}</span><span>{node.indeterminate ? '読み込み中' : `${Math.round(percent)}%`}</span></div>
          <div className={`ios-progress-track ${node.indeterminate ? 'is-indeterminate' : ''}`} style={{ height: thickness }}><span style={{ width: `${percent}%` }} /></div>
        </div>
      );
    }
    case 'gauge': {
      const percent = ((node.value - node.minimum) / (node.maximum - node.minimum)) * 100;
      return (
        <div className="ios-gauge" style={{ minHeight: node.minHeight }} aria-label={node.label || 'Gauge'}>
          <div className="ios-gauge-dial" style={{ '--gauge-progress': `${Math.max(0, Math.min(100, percent))}%` } as CSSProperties}>
            <span>{node.value}</span>
          </div>
          <div className="ios-gauge-label"><span>{node.label || 'Gauge'}</span><span>{node.minimum}–{node.maximum}</span></div>
        </div>
      );
    }
    case 'content-unavailable':
      return (
        <div className="ios-content-unavailable" role="status">
          <span className="ios-content-unavailable-symbol" aria-hidden="true">{symbolGlyph(node.systemName)}</span>
          <strong>{node.title || 'No content'}</strong>
          {node.description && <span>{node.description}</span>}
        </div>
      );
    case 'navigation-link':
      {
        const label = node.children && node.children.length > 0 ? (
          <span className="ios-navigation-content">
            {node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)}
          </span>
        ) : <span>{node.label || 'Open screen'}</span>;
        return onNavigate ? (
          <button type="button" className="ios-row ios-navigation-link" style={{ minHeight: node.minHeight }} onClick={(event) => { event.stopPropagation(); onNavigate(); }}>
            {label}
            <span className="ios-link-indicator" aria-hidden="true">›</span>
          </button>
        ) : (
          <div className="ios-row ios-navigation-link" style={{ minHeight: node.minHeight }}>
            {label}
            <span className="ios-link-indicator" aria-hidden="true">›</span>
          </div>
        );
      }
    case 'label':
      return (
        <div className="ios-label" role="img" aria-label={node.accessibilityLabel || node.title}>
          <span className="ios-image-symbol" aria-hidden="true">{symbolGlyph(node.systemName)}</span>
          <span>{node.title || 'Label'}</span>
        </div>
      );
    case 'link':
      return (
        <div className="ios-row ios-link" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Open link'}</span>
          <span className="ios-link-url">{node.url || 'URL'}</span>
        </div>
      );
    case 'datepicker':
      if (controls) {
        return (
          <label className="ios-row ios-datepicker" style={{ minHeight: node.minHeight }}>
            <span>{node.label || 'Date'}</span>
            <input className="ios-preview-date" type="date" value={stringPreviewValue(controls.value)} aria-label={node.label || 'Date'} onChange={(event) => controls.onChange(event.target.value)} />
          </label>
        );
      }
      return (
        <div className="ios-row ios-datepicker" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Date'}</span>
          <span className="ios-picker-value">今日 <span aria-hidden="true">⌄</span></span>
        </div>
      );
    case 'sheet':
      if (controls) {
        return (
          <button
            type="button"
            className="ios-row ios-sheet-trigger"
            style={{ minHeight: 44 }}
            onClick={(event) => { event.stopPropagation(); onOpenSheet?.(node.id); }}
          >
            <span>{node.label || 'Open sheet'}</span>
            <span className="ios-link-indicator" aria-hidden="true">⌃</span>
          </button>
        );
      }
      return (
        <div className="canvas-container canvas-sheet">
          <div className="section-title">{node.label || 'Open sheet'} · {node.title || 'Sheet'}</div>
          <div className="node-column" style={{ gap: 8 }}>
            {node.children.length === 0
              ? <div className="empty-container">ここへパーツをドロップ</div>
              : node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)}
          </div>
        </div>
      );
    case 'alert':
      if (controls) {
        return (
          <button
            type="button"
            className="ios-row ios-alert-trigger"
            style={{ minHeight: node.minHeight }}
            onClick={(event) => { event.stopPropagation(); onOpenSheet?.(node.id); }}
          >
            <span>{node.label || '確認を表示'}</span>
            <span className="ios-link-indicator" aria-hidden="true">›</span>
          </button>
        );
      }
      return (
        <div className="canvas-container canvas-alert">
          <div className="section-title">{node.label || '確認を表示'} · {node.title || 'Alert'}</div>
          {node.message && <div className="alert-editor-message">{node.message}</div>}
          <div className="alert-editor-actions">
            {node.secondaryButton && <span>{node.secondaryButton}</span>}
            <span>{node.primaryButton || '続ける'}</span>
          </div>
        </div>
      );
    case 'confirmation-dialog':
      if (controls) {
        return (
          <button
            type="button"
            className="ios-row ios-confirmation-trigger"
            style={{ minHeight: node.minHeight }}
            onClick={(event) => { event.stopPropagation(); onOpenSheet?.(node.id); }}
          >
            <span>{node.label || '選択肢を表示'}</span>
            <span className="ios-link-indicator" aria-hidden="true">›</span>
          </button>
        );
      }
      return (
        <div className="canvas-container canvas-confirmation-dialog">
          <div className="section-title">{node.label || '選択肢を表示'} · {node.title || 'ConfirmationDialog'}</div>
          {node.message && <div className="alert-editor-message">{node.message}</div>}
          <div className="alert-editor-actions">
            {node.options.map((option) => <span key={option}>{option}</span>)}
            {node.cancelButton && <span>{node.cancelButton}</span>}
          </div>
        </div>
      );
    case 'divider':
      return <div aria-label="Divider" className="ios-divider" />;
    case 'spacer':
      return <div aria-label="Spacer" className="ios-spacer">Spacer</div>;
    case 'navigation-split-view': {
      const sidebar = node.children[0];
      const detail = node.children.slice(1);
      const selectedIndex = controls && sidebar?.kind === 'list'
        ? Math.max(0, Math.min(sidebar.children.length - 1, Math.round(numberPreviewValue(controls.value, node.selectedIndex ?? 0))))
        : node.selectedIndex ?? 0;
      const sidebarContent = controls && sidebar?.kind === 'list'
        ? (
          <div className="navigation-rail-preview">
            {sidebar.children.map((child, index) => (
              <div className={`navigation-rail-item ${index === selectedIndex ? 'is-selected' : ''}`} key={child.id}>
                <NodeView node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />
              </div>
            ))}
          </div>
        )
        : sidebar
          ? <NodeView key={sidebar.id} node={sidebar} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />
          : <div className="empty-container">サイドバーを追加</div>;
      return (
        <div className={`canvas-navigation-split ${node.railExpanded ? 'rail-expanded' : ''} ${node.railModal ? 'rail-modal' : ''}`}>
          <div className="navigation-split-pane navigation-split-sidebar">
            {sidebarContent}
          </div>
          <div className="navigation-split-pane navigation-split-detail">
            {detail.length > 0
              ? detail.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)
              : <div className="empty-container">詳細画面を追加</div>}
          </div>
        </div>
      );
    }
    case 'vstack':
    case 'hstack':
    case 'lazyvstack':
    case 'lazyhstack':
    case 'zstack':
    case 'glass-container':
    case 'group':
    case 'tabview':
    case 'disclosure-group':
    case 'groupbox':
    case 'lazyvgrid':
    case 'lazyhgrid':
    case 'scrollview':
    case 'list':
    case 'form':
    case 'section': {
      if (node.m3eKind === 'fabMenu') {
        return (
          <div className="canvas-fab-menu-preview" aria-label={node.label || 'FABメニュー'}>
            {node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)}
            <div className="m3e-fab-menu-trigger" aria-hidden="true">{symbolGlyph(node.m3eIcon || 'plus')}</div>
          </div>
        );
      }
      if (node.kind === 'tabview' && controls) {
        const activeIndex = node.children.length > 0
          ? Math.max(0, Math.min(node.children.length - 1, Math.round(numberPreviewValue(controls.value, 0))))
          : 0;
        const activeChild = node.children[activeIndex];
        return (
          <div className="canvas-container canvas-tabview tabview-preview">
            <div className="tabview-preview-content">
              {activeChild
                ? <NodeView key={activeChild.id} node={activeChild} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />
                : <div className="empty-container">タブを追加してください</div>}
            </div>
            {node.children.length > 0 && (
              <div className="tabview-preview-bar" role="tablist" aria-label="タブ">
                {node.children.map((child, childIndex) => (
                  <button
                    className={childIndex === activeIndex ? 'is-active' : ''}
                    key={child.id}
                    type="button"
                    role="tab"
                    aria-selected={childIndex === activeIndex}
                    onClick={(event) => { event.stopPropagation(); controls.onChange(childIndex); }}
                  >
                    {previewTabTitle(child)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }
      if (node.kind === 'disclosure-group' && controls) {
        const expanded = controls.value !== false;
        return (
          <div className="canvas-container canvas-disclosure-group">
            <button
              className="section-title disclosure-toggle"
              type="button"
              aria-expanded={expanded}
              onClick={(event) => { event.stopPropagation(); controls.onChange(!expanded); }}
            >
              <span>{node.title || 'Section'}</span>
              <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
            </button>
            {expanded && (
              <div className="node-column" style={{ gap: 8 }}>
                {node.children.length === 0
                  ? <div className="empty-container">ここへパーツをドロップ</div>
                  : node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)}
              </div>
            )}
          </div>
        );
      }
      const horizontal = node.kind === 'hstack' || node.kind === 'lazyhstack';
      const overlay = node.kind === 'zstack';
      const fixedGap = node.kind === 'section' || node.kind === 'list' || node.kind === 'form' || node.kind === 'scrollview' || node.kind === 'disclosure-group'
        ? 8
        : node.spacing ?? (node.kind === 'glass-container' ? 12 : 8);
      const grid = node.kind === 'lazyvgrid' || node.kind === 'lazyhgrid';
      const childrenClass = overlay ? 'node-stack' : grid ? 'node-grid' : horizontal ? 'node-row' : 'node-column';
      const childrenStyle: CSSProperties = {
        gap: fixedGap,
        ...(node.kind === 'lazyvgrid' ? { gridTemplateColumns: `repeat(${node.columns ?? 2}, minmax(0, 1fr))` } : {}),
        ...(node.kind === 'lazyhgrid' ? { gridTemplateRows: `repeat(${node.rows ?? 2}, minmax(0, 1fr))`, gridAutoFlow: 'column' } : {}),
        ...containerAlignmentStyle(node),
      };
      const cardClass = node.kind === 'groupbox'
        ? ` card-image-${node.cardImagePosition ?? 'top'} card-content-${node.cardContentAlignment ?? 'start'}${node.cardNoImage ? ' card-no-image' : ''}`
        : '';
      const cardStyle = node.kind === 'groupbox' && node.cardImageSize !== undefined
        ? { ...childrenStyle, '--card-image-size': `${node.cardImageSize}px` } as CSSProperties
        : childrenStyle;
      return (
        <div className={`canvas-container ${horizontal ? 'horizontal' : ''} ${overlay ? 'overlay' : ''} canvas-${node.kind}${cardClass}`}>
          {node.kind === 'groupbox' && node.isBottomSheet && <div className="canvas-bottom-sheet-handle" aria-hidden="true" />}
          {(node.kind === 'section' || node.kind === 'disclosure-group' || node.kind === 'groupbox') && <div className="section-title">{node.title || 'Section'}</div>}
          <div className={childrenClass} style={cardStyle}>
            {node.children.length === 0
              ? <div className="empty-container">ここへパーツをドロップ</div>
              : node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)}
          </div>
        </div>
      );
    }
  }
}

function ScreenPreview({
  document,
  screen: initialScreen,
  previewMode,
  previewScheme,
  device,
  textScale,
}: {
  document: CanvasDocument;
  screen: CanvasScreen;
  previewMode: boolean;
  previewScheme: 'light' | 'dark';
  device: PreviewDevice;
  textScale: PreviewTextScale;
}) {
  const activeScreenId = useEditorStore((state) => state.document.activeScreenId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const addNode = useEditorStore((state) => state.addNode);
  const addM3eNode = useEditorStore((state) => state.addM3eNode);
  const addM3eScreenPart = useEditorStore((state) => state.addM3eScreenPart);
  const addPattern = useEditorStore((state) => state.addPattern);
  const moveNode = useEditorStore((state) => state.moveNode);
  const [isOver, setIsOver] = useState(false);
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);
  const [previewMotion, setPreviewMotion] = useState<{ transition: NavigationTransition; id: number } | null>(null);
  const motionId = useRef(0);
  const [previewHistory, setPreviewHistory] = useState<string[]>([initialScreen.id]);
  const validPreviewHistory = previewHistory.filter((id) => document.screens.some((candidate) => candidate.id === id));
  const previewScreenId = [...validPreviewHistory].reverse()[0] ?? initialScreen.id;
  const screen = previewMode
    ? document.screens.find((candidate) => candidate.id === previewScreenId) ?? initialScreen
    : initialScreen;
  const baseDevice = previewDevices.find((candidate) => candidate.id === screen.previewDevice) ?? device;
  const screenDevice = orientPreviewDevice(baseDevice, screen.previewOrientation);
  const hasGlass = containsGlass(screen.root.children);
  const customAccent = document.appearance.accentColor === 'custom' ? document.appearance.accentHex : undefined;
  const isActive = previewMode || activeScreenId === screen.id;
  const toolbarItems = screen.toolbarItems ?? [];
  const tabBarItems = (previewMode ? initialScreen.tabBarItems : screen.tabBarItems) ?? [];
  const leadingItems = toolbarItems.filter((item) => item.placement === 'topBarLeading');
  const trailingItems = toolbarItems.filter((item) => item.placement === 'topBarTrailing');
  const bottomItems = toolbarItems.filter((item) => item.placement === 'bottomBar');
  const titleDisplayMode = screen.navigationTitleDisplayMode ?? 'automatic';
  const openOverlay = openSheetId ? findNode(screen.root.children, openSheetId) : undefined;
  const sheet = openOverlay?.kind === 'sheet' ? openOverlay : undefined;
  const alert = openOverlay?.kind === 'alert' ? openOverlay : undefined;
  const confirmationDialog = openOverlay?.kind === 'confirmation-dialog' ? openOverlay : undefined;
  const canGoBack = previewMode && validPreviewHistory.length > 1;
  const swipeEnabled = previewMode && (canGoBack || Object.keys(screen.swipe ?? {}).length > 0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const connections = screenConnections(initialScreen);

  useEffect(() => {
    if (!previewMotion) return undefined;
    const timer = window.setTimeout(() => setPreviewMotion(null), 360);
    return () => window.clearTimeout(timer);
  }, [previewMotion]);

  const triggerPreviewMotion = (transition: NavigationTransition | undefined) => {
    if (!transition || transition === 'none') {
      setPreviewMotion(null);
      return;
    }
    setPreviewMotion({ transition, id: ++motionId.current });
  };

  const navigatePreview = (screenId: string, transition: NavigationTransition = 'slide') => {
    if (!document.screens.some((candidate) => candidate.id === screenId)) return;
    triggerPreviewMotion(transition);
    setOpenSheetId(null);
    setPreviewHistory((current) => [...current, screenId]);
  };

  const backPreview = (transition: NavigationTransition = 'slideLeft') => {
    setOpenSheetId(null);
    triggerPreviewMotion(transition);
    setPreviewHistory((current) => current.length > 1 ? current.slice(0, -1) : current);
  };

  const finishSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!previewMode || !start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 52) return;
    const direction: SwipeDirection = Math.abs(dx) >= Math.abs(dy)
      ? dx < 0 ? 'left' : 'right'
      : dy < 0 ? 'up' : 'down';
    const destination = screen.swipe?.[direction];
    if (destination) navigatePreview(destination, swipeTransition(direction));
    else if (direction === 'right' && canGoBack) backPreview('slideLeft');
  };

  const dropOnScreen = (event: React.DragEvent) => {
    if (previewMode || !hasNodeDragData(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsOver(false);
    const data = readDragData(event);
    if (!data) return;
    if (data.kind === 'move' && activeScreenId !== screen.id) return;
    selectScreen(screen.id);
    if (data.kind === 'm3e-screen') addM3eScreenPart(data.m3eKind);
    else if (data.kind === 'new') addNode(data.nodeKind);
    else if (data.kind === 'm3e') addM3eNode(data.m3eKind);
    else if (data.kind === 'pattern') addPattern(data.pattern);
    else if (data.kind === 'move') moveNode(data.nodeId, null);
  };

  return (
    <article
      className={`screen-preview ${isActive ? 'is-active' : ''} ${screenDevice.kind === 'tablet' ? 'tablet-preview' : ''}`}
      style={{
        '--device-width': `${screenDevice.width}px`,
        '--device-height': `${screenDevice.height}px`,
        '--device-shell-width': `${screenDevice.width + 30}px`,
        '--device-shell-height': `${screenDevice.height + 30}px`,
        '--preview-text-scale': previewTextScales.find((scale) => scale.id === textScale)?.factor ?? 1,
      } as CSSProperties}
    >
      <header className="screen-preview-header">
        <button className="screen-preview-name" type="button" onClick={previewMode ? undefined : () => { selectScreen(screen.id); selectNode(null); }}>
          <strong>{screen.name}</strong>
          <span>{isActive ? '編集中' : '表示のみ'}</span>
        </button>
        <span className="screen-preview-size">{screenDevice.width} × {screenDevice.height} pt</span>
      </header>
      {!previewMode && connections.length > 0 && (
        <div className="screen-flow-summary" aria-label={`${initialScreen.name}の画面遷移`}>
          <span className="screen-flow-title">遷移</span>
          <div className="screen-flow-links">
            {connections.map((connection) => {
              const destination = document.screens.find((candidate) => candidate.id === connection.destinationScreenId);
              return (
                <button
                  className="screen-flow-link"
                  key={`${connection.nodeId ?? connection.gesture}-${connection.destinationScreenId}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectScreen(initialScreen.id);
                    selectNode(connection.nodeId);
                  }}
                  title={`${initialScreen.name}から${destination?.name ?? '未設定'}へ`}
                >
                  <span aria-hidden="true">→</span>
                  <span>{destination?.name ?? '未設定'}</span>
                  <span className="screen-flow-kind">{connection.gesture ?? 'NavigationLink'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        className={`phone-shell ${isOver ? 'is-over' : ''}`}
        onClick={previewMode ? undefined : (event) => { event.stopPropagation(); selectScreen(screen.id); selectNode(null); }}
        onDragEnter={previewMode ? undefined : (event) => { if (hasNodeDragData(event)) setIsOver(true); }}
        onDragLeave={previewMode ? undefined : () => setIsOver(false)}
        onDragOver={previewMode ? undefined : (event) => { if (hasNodeDragData(event)) event.preventDefault(); }}
        onDrop={previewMode ? undefined : dropOnScreen}
      >
        <div
        className={`phone-screen scheme-${previewScheme} accent-${document.appearance.accentColor} type-${document.appearance.fontDesign ?? 'default'} text-scale-${textScale} ${hasGlass ? 'has-glass' : ''} ${swipeEnabled ? 'swipe-enabled' : ''} ${previewMotion ? `preview-motion-${previewMotion.transition}-${previewMotion.id}` : ''}`}
        style={{
          '--preview-accent': customAccent ?? previewAccentColor(document.appearance.accentColor),
          '--screen-background': previewScreenBackground(screen.background, previewScheme, customAccent ?? previewAccentColor(document.appearance.accentColor)),
          '--screen-foreground': previewScreenForeground(screen.background, previewScheme),
        } as CSSProperties}
          aria-label={`${screen.name} iPhoneプレビュー`}
          onPointerDown={previewMode ? (event) => { swipeStart.current = { x: event.clientX, y: event.clientY }; } : undefined}
          onPointerUp={previewMode ? finishSwipe : undefined}
          onPointerCancel={previewMode ? () => { swipeStart.current = null; } : undefined}
        >
          <div className="statusbar"><span>9:41</span><span className="status-icons" aria-hidden="true">5G  ▮▮</span></div>
          <div className="dynamic-island" aria-hidden="true" />
          <div className={`navigation-header title-${titleDisplayMode} ${screen.m3eTopAppBar?.contained ? 'm3e-screen-contained' : ''}`} style={m3eScreenPartStyle(screen.m3eTopAppBar)}>
            {(canGoBack || leadingItems.length > 0) && (
              <div className="navigation-toolbar-slot leading">
                {canGoBack && (
                    <button className="ios-back-button" type="button" onClick={(event) => { event.stopPropagation(); backPreview(); }}>
                    <span aria-hidden="true">‹</span><span>戻る</span>
                  </button>
                )}
                {leadingItems.map((item) => <PreviewToolbarButton item={item} onNavigate={previewMode ? item.navigationAction === 'back' ? () => backPreview(item.navigationTransition) : item.destinationScreenId ? () => navigatePreview(item.destinationScreenId as string, item.navigationTransition) : undefined : undefined} key={item.id} />)}
              </div>
            )}
            <div className="navigation-title">{screen.navigationTitle}</div>
            {trailingItems.length > 0 && (
              <div className="navigation-toolbar-slot trailing">
                {trailingItems.map((item) => <PreviewToolbarButton item={item} onNavigate={previewMode ? item.navigationAction === 'back' ? () => backPreview(item.navigationTransition) : item.destinationScreenId ? () => navigatePreview(item.destinationScreenId as string, item.navigationTransition) : undefined : undefined} key={item.id} />)}
              </div>
            )}
          </div>
          <div className={`screen-content placement-${screen.contentPlacement ?? 'top'}`}>
            {screen.root.children.length === 0 && <div className="screen-drop-hint">ここへパーツをドロップ</div>}
            {screen.root.children.map((node) => <NodeView key={node.id} node={node} allNodes={screen.root.children} screenId={screen.id} onOpenSheet={setOpenSheetId} onNavigateScreen={navigatePreview} onNavigateBack={backPreview} />)}
          </div>
          {previewMode && sheet && (
            <SheetPreview
              node={sheet}
              allNodes={screen.root.children}
              screenId={screen.id}
              onClose={() => setOpenSheetId(null)}
              onOpenSheet={setOpenSheetId}
              onNavigateScreen={navigatePreview}
              onNavigateBack={backPreview}
            />
          )}
          {previewMode && alert && (
            <AlertPreview node={alert} onClose={() => setOpenSheetId(null)} />
          )}
          {previewMode && confirmationDialog && (
            <ConfirmationDialogPreview node={confirmationDialog} onClose={() => setOpenSheetId(null)} />
          )}
          {tabBarItems.length > 0 ? (
            <nav className={`ios-tab-bar ${screen.m3eBottomNav?.contained ? 'm3e-screen-contained' : ''}`} style={m3eScreenPartStyle(screen.m3eBottomNav)} aria-label="タブバー">
              {tabBarItems.map((item) => {
                const destination = item.destinationScreenId;
                const selected = previewMode
                  ? (destination ? destination === screen.id : screen.id === initialScreen.id)
                  : item.selected ?? false;
                return (
                  <button
                    className={`ios-tab-bar-item ${selected ? 'is-selected' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={item.title || 'タブ'}
                    key={item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item.navigationAction === 'back' && previewMode) backPreview(item.navigationTransition);
                      else if (destination && previewMode) navigatePreview(destination, item.navigationTransition);
                      else if (destination && !previewMode) selectScreen(destination);
                    }}
                  >
                    {item.systemName && <span className="ios-tab-bar-symbol" aria-hidden="true">{symbolGlyph(item.systemName)}</span>}
                    <span>{item.title || 'タブ'}</span>
                  </button>
                );
              })}
            </nav>
          ) : bottomItems.length > 0 && (
            <div className={`ios-bottom-toolbar ${screen.m3eBottomNav?.contained ? 'm3e-screen-contained' : ''}`} style={m3eScreenPartStyle(screen.m3eBottomNav)} role="toolbar" aria-label="下部ツールバー">
              {bottomItems.map((item) => <PreviewToolbarButton item={item} onNavigate={previewMode ? item.navigationAction === 'back' ? () => backPreview(item.navigationTransition) : item.destinationScreenId ? () => navigatePreview(item.destinationScreenId as string, item.navigationTransition) : undefined : undefined} key={item.id} />)}
            </div>
          )}
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function useSystemDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;

    const update = (event: MediaQueryListEvent | MediaQueryList) => setIsDark(event.matches);
    update(query);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDark;
}

function PreviewToolbarButton({ item, onNavigate }: { item: ToolbarItem; onNavigate?: () => void }) {
  return (
    <button
      className={`ios-toolbar-button ${item.role === 'destructive' ? 'destructive' : ''} ${item.selected ? 'is-selected' : ''}`}
      type="button"
      aria-label={item.title || 'Toolbar action'}
      title={item.title || 'Toolbar action'}
      aria-current={item.selected ? 'page' : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate?.();
      }}
    >
      {item.systemName ? <span className="ios-toolbar-symbol" aria-hidden="true">{symbolGlyph(item.systemName)}</span> : null}
      <span className={item.systemName ? 'ios-toolbar-title' : ''}>{item.title || 'Action'}</span>
    </button>
  );
}

function AlertPreview({ node, onClose }: { node: AlertNode; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="ios-alert-layer" role="presentation">
      <button className="ios-alert-backdrop" type="button" aria-label="アラートを閉じる" onClick={onClose} />
      <section className="ios-alert-dialog" role="alertdialog" aria-modal="true" aria-label={node.title || 'Alert'}>
        <div className="ios-alert-copy">
          <h2>{node.title || 'Alert'}</h2>
          {node.message && <p>{node.message}</p>}
        </div>
        <div className="ios-alert-actions">
          {node.secondaryButton && (
            <button className={`ios-alert-action ${node.secondaryRole === 'destructive' ? 'destructive' : ''}`} type="button" onClick={onClose}>
              {node.secondaryButton}
            </button>
          )}
          <button className={`ios-alert-action ${node.primaryRole === 'destructive' ? 'destructive' : ''}`} type="button" onClick={onClose}>
            {node.primaryButton || '続ける'}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmationDialogPreview({ node, onClose }: { node: ConfirmationDialogNode; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="ios-confirmation-layer" role="presentation">
      <button className="ios-confirmation-backdrop" type="button" aria-label="選択肢を閉じる" onClick={onClose} />
      <section className="ios-confirmation-dialog" role="dialog" aria-modal="true" aria-label={node.title || 'ConfirmationDialog'}>
        <div className="ios-confirmation-copy">
          <h2>{node.title || '操作を選択'}</h2>
          {node.message && <p>{node.message}</p>}
        </div>
        <div className="ios-confirmation-actions">
          {node.options.map((option) => (
            <button className="ios-confirmation-action" type="button" key={option} onClick={onClose}>{option}</button>
          ))}
          {node.cancelButton && <button className="ios-confirmation-action cancel" type="button" onClick={onClose}>{node.cancelButton}</button>}
        </div>
      </section>
    </div>
  );
}

function SheetPreview({
  node,
  allNodes,
  screenId,
  onClose,
  onOpenSheet,
  onNavigateScreen,
  onNavigateBack,
}: {
  node: ContainerNode;
  allNodes: CanvasNode[];
  screenId: string;
  onClose: () => void;
  onOpenSheet: (nodeId: string) => void;
  onNavigateScreen?: (screenId: string, transition?: NavigationTransition) => void;
  onNavigateBack?: (transition?: NavigationTransition) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="ios-sheet-layer" role="dialog" aria-modal="true" aria-label={node.title || 'Sheet'}>
      <button className="ios-sheet-backdrop" type="button" aria-label="シートを閉じる" onClick={onClose} />
      <section className="ios-sheet-dialog">
        <div className="ios-sheet-handle" aria-hidden="true" />
        <header className="ios-sheet-header">
          <strong>{node.title || 'Sheet'}</strong>
          <button className="ios-sheet-close" type="button" onClick={onClose}>閉じる</button>
        </header>
        <div className="ios-sheet-content node-column" style={{ gap: 8 }}>
          {node.children.length === 0
            ? <div className="empty-container">シートの内容を追加してください</div>
            : node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} screenId={screenId} onOpenSheet={onOpenSheet} onNavigateScreen={onNavigateScreen} onNavigateBack={onNavigateBack} />)}
        </div>
      </section>
    </div>
  );
}

export function PhoneCanvas() {
  const document = useEditorStore((state) => state.document);
  const selectNode = useEditorStore((state) => state.selectNode);
  const tidyActiveScreen = useEditorStore((state) => state.tidyActiveScreen);
  const updateActiveScreen = useEditorStore((state) => state.updateActiveScreen);
  const previewMode = useEditorStore((state) => state.previewMode);
  const systemDark = useSystemDarkMode();
  const activeScreen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const [zoom, setZoom] = useState(100);
  const [showGuides, setShowGuides] = useState(true);
  const [codeShelfOpen, setCodeShelfOpen] = useState(true);
  const [previewTextScale, setPreviewTextScale] = useState<PreviewTextScale>('default');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);
      if (previewMode || isEditing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((current) => Math.min(MAX_ZOOM, current + 25));
      } else if (event.key === '-') {
        event.preventDefault();
        setZoom((current) => Math.max(MIN_ZOOM, current - 25));
      } else if (event.key === '0') {
        event.preventDefault();
        setZoom(60);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMode]);

  if (!activeScreen) return null;

  const visibleScreens = previewMode ? [activeScreen] : document.screens;
  const previewScheme = document.appearance.colorScheme === 'system'
    ? systemDark ? 'dark' : 'light'
    : document.appearance.colorScheme;
  const previewDeviceId: ScreenDevice = activeScreen.previewDevice ?? 'iphone-16';
  const basePreviewDevice = previewDevices.find((device) => device.id === previewDeviceId) ?? previewDevices[1];
  if (!basePreviewDevice) return null;
  const previewDevice = orientPreviewDevice(basePreviewDevice, activeScreen.previewOrientation);
  const textScaleLabel = previewTextScales.find((scale) => scale.id === previewTextScale)?.label ?? '標準文字';

  return (
    <main className={`workspace ${showGuides ? 'guides-on' : 'no-guides'} ${previewMode ? 'preview-mode' : ''} ${!previewMode && !codeShelfOpen ? 'code-shelf-collapsed' : ''}`} onClick={previewMode ? undefined : () => selectNode(null)}>
      <div className="workspace-toolbar">
        <div className="workspace-title">
          <span className="workspace-kicker">編集領域</span>
          <strong>{previewMode ? 'プレビュー' : 'キャンバス'}</strong>
          <span>{previewMode ? activeScreen.name : `${document.screens.length}画面`}</span>
        </div>
        {!previewMode && <div className="workspace-controls" onClick={(event) => event.stopPropagation()}>
          <label className="workspace-device-select">
            <span className="visually-hidden">プレビュー端末</span>
            <select value={previewDevice.id} onChange={(event) => updateActiveScreen({ previewDevice: event.target.value as ScreenDevice })} aria-label="プレビュー端末">
              {previewDevices.map((device) => <option value={device.id} key={device.id}>{device.label}</option>)}
            </select>
          </label>
          <label className="workspace-device-select workspace-text-scale-select">
            <span className="visually-hidden">プレビュー文字サイズ</span>
            <select value={previewTextScale} onChange={(event) => setPreviewTextScale(event.target.value as PreviewTextScale)} aria-label="プレビュー文字サイズ">
              {previewTextScales.map((scale) => <option value={scale.id} key={scale.id}>{scale.label}</option>)}
            </select>
          </label>
          <button className="canvas-toolbar-button" type="button" onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - 25))} aria-label="ズームアウト">−</button>
          <button className="zoom-value" type="button" onClick={() => setZoom(100)}>{zoom}%</button>
          <button className="canvas-toolbar-button" type="button" onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + 25))} aria-label="ズームイン">＋</button>
          <span className="toolbar-divider" aria-hidden="true" />
          <button className="canvas-toolbar-button fit-button" type="button" onClick={() => setZoom(60)}>全体表示</button>
          <button className="canvas-toolbar-button" type="button" onClick={tidyActiveScreen} title="SwiftUIの標準的な間隔と操作領域に整える">整える</button>
          <button className={`canvas-toolbar-button guide-button ${showGuides ? 'active' : ''}`} type="button" aria-pressed={showGuides} onClick={() => setShowGuides((current) => !current)}>ガイド</button>
        </div>}
      </div>
      <div className="workspace-ruler"><span>{previewMode ? `操作確認 · ${previewDevice.label} · ${textScaleLabel} · 編集不可` : `${previewDevice.label} · ${textScaleLabel} · 編集可能`}</span><span>{previewDevice.width} × {previewDevice.height} pt · {zoom}%</span></div>
      <div
        className="canvas-scroll-area"
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          const delta = event.deltaY > 0 ? -25 : 25;
          setZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)));
        }}
      >
        <div className="screen-board" style={{ transform: `scale(${zoom / 100})` }}>
          {visibleScreens.map((screen, index) => {
            const nextScreen = visibleScreens[index + 1];
            const swipeDestinations = Object.values(screen.swipe ?? {});
            const navigationConnected = nextScreen && screenDestinations(screen).includes(nextScreen.id);
            const swipeConnected = Boolean(nextScreen && swipeDestinations.includes(nextScreen.id));
            const connected = Boolean(navigationConnected || swipeConnected);
            const screenDevice = previewDevices.find((candidate) => candidate.id === (screen.previewDevice ?? 'iphone-16')) ?? basePreviewDevice;
            return (
              <div className="screen-board-item" key={screen.id}>
                <ScreenPreview document={document} screen={screen} previewMode={previewMode} previewScheme={previewScheme} device={screenDevice} textScale={previewTextScale} key={`${screen.id}-${previewMode ? 'preview' : 'editor'}-${screenDevice.id}-${screen.previewOrientation ?? 'portrait'}-${previewTextScale}`} />
                {nextScreen && (
                  <div className={`screen-connector ${connected ? 'is-connected' : ''}`} aria-label={connected ? `${screen.name}から${nextScreen.name}へ接続` : undefined}>
                    {connected && <><span className="connector-line" /><span className="connector-arrow" aria-hidden="true">→</span><span className="connector-label">{swipeConnected && !navigationConnected ? 'スワイプ遷移' : 'NavigationLink'}</span></>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {!previewMode && <CodeShelf open={codeShelfOpen} onToggle={() => setCodeShelfOpen((current) => !current)} />}
    </main>
  );
}

function CodeShelf({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const document = useEditorStore((state) => state.document);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const [imageState, setImageState] = useState<'idle' | 'done' | 'error'>('idle');
  const swiftui = useMemo(() => generateSwiftUI(document), [document]);
  const lines = swiftui.split('\n');

  const savePng = async () => {
    const element = window.document.querySelector('.screen-preview.is-active .phone-screen');
    if (!(element instanceof HTMLElement)) {
      setImageState('error');
      return;
    }
    try {
      const filename = `${document.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'ioscanvas'}-${document.activeScreenId}.png`;
      await downloadElementAsPng(element, filename);
      setImageState('done');
      window.setTimeout(() => setImageState('idle'), 1600);
    } catch {
      setImageState('error');
    }
  };

  return (
    <section className={`code-shelf ${open ? '' : 'is-collapsed'}`} onClick={(event) => event.stopPropagation()}>
      <header className="code-shelf-header">
        <div className="code-shelf-title"><strong>コードシェルフ</strong><span>構造から生成</span></div>
        <div className="code-shelf-actions">
          {open && <>
            <span className="code-language">SwiftUI</span>
            <button type="button" onClick={savePng}>{imageState === 'done' ? '画像を保存しました' : imageState === 'error' ? '画像保存に失敗' : 'PNG保存'}</button>
            <button type="button" onClick={() => setExportOpen(true)}>全コードを表示</button>
          </>}
          <button type="button" className="code-shelf-toggle" onClick={onToggle} aria-expanded={open} aria-controls="generated-code-preview">
            {open ? 'コードを隠す' : 'コードを表示'}
          </button>
        </div>
      </header>
      <div id="generated-code-preview" className="code-file-tabs" role="tablist" aria-label="生成ファイル">
        {document.screens.map((screen) => (
          <button
            className={screen.id === document.activeScreenId ? 'is-active' : ''}
            key={screen.id}
            type="button"
            role="tab"
            aria-selected={screen.id === document.activeScreenId}
            onClick={() => selectScreen(screen.id)}
          >
            <span aria-hidden="true">⌘</span>{screen.name}.swift
          </button>
        ))}
      </div>
      <pre className="code-preview"><code>{lines.slice(0, 18).map((line, index) => `${String(index + 1).padStart(2, ' ')}  ${line}`).join('\n')}{lines.length > 18 ? '\n…' : ''}</code></pre>
    </section>
  );
}

function containsGlass(nodes: CanvasNode[]): boolean {
  return nodes.some((node) => Boolean(node.glass) || node.kind === 'glass-container' || (node.children ? containsGlass(node.children) : false));
}

function textStyleSize(style: TextStyle | undefined): number | undefined {
  if (!style || style === 'custom') return undefined;
  return {
    largeTitle: 34,
    title: 28,
    title2: 22,
    title3: 20,
    headline: 17,
    body: 17,
    callout: 16,
    subheadline: 15,
    footnote: 13,
    caption: 12,
    caption2: 11,
  }[style];
}

function previewAccentColor(accent: CanvasDocument['appearance']['accentColor']): string {
  return {
    blue: '#007aff',
    purple: '#af52de',
    pink: '#ff2d55',
    orange: '#ff9500',
    green: '#34c759',
    custom: '#007aff',
  }[accent];
}

function previewScreenBackground(background: ScreenBackground | undefined, scheme: 'light' | 'dark', accent: string): string {
  const dark = scheme === 'dark';
  switch (background ?? 'surface') {
    case 'surfaceContainerLow': return dark ? '#1c1c1e' : '#f2f2f7';
    case 'surfaceContainer': return dark ? '#242426' : '#e5e5ea';
    case 'surfaceContainerHigh': return dark ? '#2c2c2e' : '#d1d1d6';
    case 'surfaceContainerHighest': return dark ? '#3a3a3c' : '#c7c7cc';
    case 'primaryContainer': return `color-mix(in srgb, ${accent} ${dark ? '28%' : '16%'}, ${dark ? '#1c1c1e' : '#f2f2f7'})`;
    case 'secondaryContainer': return `color-mix(in srgb, ${accent} ${dark ? '18%' : '10%'}, ${dark ? '#1c1c1e' : '#f2f2f7'})`;
    case 'tertiaryContainer': return `color-mix(in srgb, #ff9500 ${dark ? '18%' : '10%'}, ${dark ? '#1c1c1e' : '#f2f2f7'})`;
    case 'primary': return accent;
    case 'inverseSurface': return dark ? '#f5f5f7' : '#1c1c1e';
    case 'surface':
    default: return dark ? '#000' : '#f2f2f7';
  }
}

function previewScreenForeground(background: ScreenBackground | undefined, scheme: 'light' | 'dark'): string {
  if (background === 'primary' || background === 'inverseSurface') return '#fff';
  return scheme === 'dark' ? '#f5f5f7' : '#111';
}

function swipeTransition(direction: SwipeDirection): NavigationTransition {
  switch (direction) {
    case 'right': return 'slideLeft';
    case 'up': return 'slideUp';
    case 'down': return 'slideDown';
    case 'left':
    default: return 'slide';
  }
}

function fontDesignFamily(design: FontDesign | undefined): string | undefined {
  if (!design || design === 'default') return undefined;
  return {
    rounded: 'ui-rounded, system-ui, sans-serif',
    serif: 'ui-serif, Georgia, serif',
    monospaced: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  }[design];
}

function symbolGlyph(systemName: string): string {
  return {
    'house.fill': '⌂',
    'star.fill': '★',
    'gearshape.fill': '⚙',
    'bell.fill': '♢',
    'checkmark.circle.fill': '✓',
    'checkmark.circle': '✓',
    'checkmark': '✓',
    'xmark.circle.fill': '×',
    'chevron.right': '›',
    'chevron.left': '‹',
    'chevron.down': '⌄',
    'ellipsis.circle': '…',
    'questionmark.circle': '?',
    'info.circle': 'i',
    'plus.circle': '+',
    'minus': '−',
    'person.circle': '人',
    'person.crop.circle': '人',
    'magnifyingglass': '⌕',
    'trash': '♲',
    'pencil': '✎',
    'photo': '▧',
    'camera.fill': '▣',
    'map.fill': '⌖',
    'folder.fill': '▰',
    'doc.fill': '▤',
    'calendar': '▦',
    'clock': '◷',
    'heart.fill': '♥',
    'bookmark.fill': '▮',
    'lock.fill': '▣',
    'eye.fill': '◉',
    'eye.slash.fill': '⊘',
    'slider.horizontal.3': '☷',
    'square.and.arrow.up': '↑',
    'arrow.right': '→',
    'arrow.left': '←',
    'arrow.up': '↑',
    'arrow.down': '↓',
    'paperplane.fill': '➤',
    'line.3.horizontal': '☰',
    plus: '+',
    xmark: '×',
  }[systemName] ?? '⌘';
}

function initialPreviewValue(node: CanvasNode): PreviewValue {
  switch (node.kind) {
    case 'button': return node.toggle?.isOn ?? false;
    case 'toggle': return node.isOn ?? false;
    case 'tabview': return node.selectedIndex ?? 0;
    case 'navigation-split-view': return node.selectedIndex ?? 0;
    case 'disclosure-group': return true;
    case 'picker': return node.initialOption ?? node.options[0] ?? '';
    case 'menu': return node.options[0] ?? '';
    case 'colorpicker': return node.color;
    case 'slider':
    case 'stepper': return node.value;
    default: return '';
  }
}

function stringPreviewValue(value: PreviewValue): string {
  return typeof value === 'string' ? value : '';
}

function colorPreviewValue(value: PreviewValue, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function numberPreviewValue(value: PreviewValue, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function previewTabTitle(node: CanvasNode): string {
  if (node.tabTitle?.trim()) return node.tabTitle;
  if (node.kind === 'text') return node.text || 'タブ';
  if (node.kind === 'image') return node.accessibilityLabel || 'タブ';
  if ('title' in node && typeof node.title === 'string' && node.title.trim()) return node.title;
  if ('label' in node && typeof node.label === 'string' && node.label.trim()) return node.label;
  return 'タブ';
}

function previewNodeStyle(node: CanvasNode): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (node.padding !== undefined) style.padding = node.padding;
  if (node.frameWidth === 'max') style.width = '100%';
  if (node.background && node.background !== 'none') {
    style.background = nodeBackgroundColor(node.background);
  } else if (node.m3eMetadata?.fill) {
    style.background = m3eFillColor(node.m3eMetadata.fill);
  }
  if (node.cornerRadius !== undefined) style.borderRadius = node.cornerRadius;
  if (node.cornerRadius === undefined) {
    const radius = m3eCornerRadius(node.m3eMetadata);
    if (radius) style.borderRadius = radius;
  }
  if (node.m3eMetadata?.textColor) style.color = m3eTextColor(node.m3eMetadata.textColor);
  if (node.m3eMetadata && (node.kind === 'button' || node.kind === 'image' || node.kind === 'groupbox')) {
    if (node.m3eMetadata.size !== undefined) style.width = node.m3eMetadata.size;
    if (node.m3eMetadata.size2 !== undefined) style.minHeight = node.m3eMetadata.size2;
  }
  if (node.overlay || (node.shadow && node.shadow !== 'none')) {
    const shadow = node.shadow === 'medium'
      ? '0 8px 18px rgba(0, 0, 0, .16)'
      : node.shadow === 'subtle'
        ? '0 3px 8px rgba(0, 0, 0, .12)'
        : '';
    style.boxShadow = [
      node.overlay ? 'inset 0 0 0 1px rgba(120, 120, 128, .35)' : '',
      shadow,
    ].filter(Boolean).join(', ') || undefined;
  }
  const customProperties: Record<string, string> = {};
  const metadataStyle = m3eMetadataStyle(node.m3eMetadata);
  if (metadataStyle.background) customProperties['--m3e-fill'] = String(metadataStyle.background);
  if (metadataStyle.color) customProperties['--m3e-text-color'] = String(metadataStyle.color);
  if (node.m3eMetadata?.iconFill) customProperties['--m3e-icon-fill'] = node.m3eMetadata.iconFill === 'none' ? 'transparent' : String(m3eFillColor(node.m3eMetadata.iconFill));
  const radius = m3eCornerRadius(node.m3eMetadata);
  if (radius) customProperties['--m3e-radius'] = radius;
  return Object.keys(style).length > 0 || Object.keys(customProperties).length > 0
    ? { ...style, ...customProperties } as CSSProperties
    : undefined;
}

function nodeBackgroundColor(background: CanvasNode['background']): string | undefined {
  switch (background) {
    case 'secondary': return 'rgba(120, 120, 128, .12)';
    case 'tertiary': return 'rgba(120, 120, 128, .07)';
    case 'accent': return 'rgba(10, 132, 255, .14)';
    case 'material': return 'rgba(255, 255, 255, .34)';
    default: return undefined;
  }
}

function m3eFillColor(fill: ScreenBackground | undefined): string | undefined {
  switch (fill) {
    case 'surface': return 'var(--screen-background)';
    case 'surfaceContainerLow': return 'color-mix(in srgb, var(--screen-foreground) 6%, var(--screen-background))';
    case 'surfaceContainer': return 'color-mix(in srgb, var(--screen-foreground) 12%, var(--screen-background))';
    case 'surfaceContainerHigh': return 'color-mix(in srgb, var(--screen-foreground) 18%, var(--screen-background))';
    case 'surfaceContainerHighest': return 'color-mix(in srgb, var(--screen-foreground) 24%, var(--screen-background))';
    case 'primaryContainer': return 'color-mix(in srgb, var(--preview-accent) 18%, var(--screen-background))';
    case 'secondaryContainer': return 'color-mix(in srgb, var(--preview-accent) 10%, var(--screen-background))';
    case 'tertiaryContainer': return 'color-mix(in srgb, #ff9500 12%, var(--screen-background))';
    case 'primary': return 'var(--preview-accent)';
    case 'inverseSurface': return 'var(--screen-foreground)';
    default: return undefined;
  }
}

function m3eTextColor(color: M3eTextColor | undefined): string | undefined {
  switch (color) {
    case 'primary': return 'var(--preview-accent)';
    case 'secondary': return 'color-mix(in srgb, var(--screen-foreground) 64%, var(--screen-background))';
    case 'onSurface': return 'var(--screen-foreground)';
    case 'onSurfaceVariant': return 'color-mix(in srgb, var(--screen-foreground) 72%, var(--screen-background))';
    case 'onPrimaryContainer':
    case 'onSecondaryContainer':
    case 'onTertiaryContainer': return 'var(--screen-foreground)';
    case 'inverseOnSurface': return 'var(--screen-background)';
    default: return undefined;
  }
}

function m3eCornerRadius(metadata: M3eItemMetadata | undefined): string | undefined {
  if (metadata?.corners) {
    const { tl, tr, br, bl } = metadata.corners;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  if (metadata?.radiusTop !== undefined || metadata?.radiusBottom !== undefined) {
    const top = metadata.radiusTop ?? 0;
    const bottom = metadata.radiusBottom ?? 0;
    return `${top}px ${top}px ${bottom}px ${bottom}px`;
  }
  return undefined;
}

function m3eMetadataStyle(metadata: M3eItemMetadata | undefined): CSSProperties {
  return {
    ...(metadata?.fill ? { background: m3eFillColor(metadata.fill) } : {}),
    ...(metadata?.textColor ? { color: m3eTextColor(metadata.textColor) } : {}),
    ...(m3eCornerRadius(metadata) ? { borderRadius: m3eCornerRadius(metadata) } : {}),
  };
}

function m3eContentStyle(node: CanvasNode): CSSProperties {
  const style: CSSProperties = {
    ...m3eMetadataStyle(node.m3eMetadata),
    ...(node.background && node.background !== 'none' ? { background: nodeBackgroundColor(node.background) } : {}),
  };
  if (node.m3eMetadata?.size !== undefined && (node.kind === 'button' || node.kind === 'image')) style.width = node.m3eMetadata.size;
  if (node.m3eMetadata?.size2 !== undefined && (node.kind === 'button' || node.kind === 'image')) style.minHeight = node.m3eMetadata.size2;
  return style;
}

function m3eIconStyle(node: CanvasNode): CSSProperties | undefined {
  const metadata = node.m3eMetadata;
  if (!metadata?.iconFill && !metadata?.textColor) return undefined;
  return {
    ...(metadata.iconFill ? { background: metadata.iconFill === 'none' ? 'transparent' : m3eFillColor(metadata.iconFill), padding: metadata.iconFill === 'none' ? 0 : 4, borderRadius: 8 } : {}),
    ...(metadata.textColor ? { color: m3eTextColor(metadata.textColor) } : {}),
  };
}

function m3eScreenPartStyle(metadata: M3eItemMetadata | undefined): CSSProperties | undefined {
  if (!metadata) return undefined;
  return {
    ...m3eMetadataStyle(metadata),
    ...(metadata.size !== undefined ? { minHeight: metadata.size } : {}),
  };
}

function containerAlignmentStyle(node: CanvasNode): CSSProperties {
  if (node.kind !== 'vstack' && node.kind !== 'hstack' && node.kind !== 'lazyvstack' && node.kind !== 'lazyhstack') return {};
  if (node.kind === 'vstack' || node.kind === 'lazyvstack') {
    return { alignItems: node.alignment === 'leading' ? 'flex-start' : node.alignment === 'trailing' ? 'flex-end' : 'center' };
  }
  return { alignItems: node.alignment === 'top' ? 'flex-start' : node.alignment === 'bottom' ? 'flex-end' : 'center' };
}

function navigationDestinations(nodes: CanvasNode[]): string[] {
  return [...new Set(nodes.flatMap((node) => [
    ...((node.kind === 'navigation-link' || node.kind === 'button') && node.destinationScreenId ? [node.destinationScreenId] : []),
    ...(node.children ? navigationDestinations(node.children) : []),
  ]))];
}

function screenDestinations(screen: CanvasScreen): string[] {
  return [...new Set([
    ...navigationDestinations(screen.root.children),
    ...(screen.toolbarItems ?? []).flatMap((item) => item.destinationScreenId ? [item.destinationScreenId] : []),
    ...(screen.tabBarItems ?? []).flatMap((item) => item.destinationScreenId ? [item.destinationScreenId] : []),
  ])];
}

interface ScreenConnection {
  destinationScreenId: string;
  nodeId: string | null;
  gesture?: string;
}

function screenConnections(screen: CanvasScreen): ScreenConnection[] {
  const navigation = navigationLinks(screen.root.children).flatMap((node) =>
    node.destinationScreenId
      ? [{ destinationScreenId: node.destinationScreenId, nodeId: node.id }]
      : [],
  );
  const toolbar = (screen.toolbarItems ?? []).flatMap((item) =>
    item.destinationScreenId
      ? [{ destinationScreenId: item.destinationScreenId, nodeId: null, gesture: `ツールバー · ${item.title}` }]
      : [],
  );
  const tabBar = (screen.tabBarItems ?? []).flatMap((item) =>
    item.destinationScreenId
      ? [{ destinationScreenId: item.destinationScreenId, nodeId: null, gesture: `タブバー · ${item.title}` }]
      : [],
  );
  const swipe = Object.entries(screen.swipe ?? {}).map(([direction, destinationScreenId]) => ({
    destinationScreenId,
    nodeId: null,
    gesture: direction === 'left' ? '左スワイプ' : direction === 'right' ? '右スワイプ' : direction === 'up' ? '上スワイプ' : '下スワイプ',
  }));
  return [...navigation, ...toolbar, ...tabBar, ...swipe];
}

function navigationLinks(nodes: CanvasNode[]): Extract<CanvasNode, { kind: 'navigation-link' | 'button' }>[] {
  return nodes.flatMap((node) => [
    ...(node.kind === 'navigation-link' || node.kind === 'button' ? (node.destinationScreenId ? [node] : []) : []),
    ...(node.children ? navigationLinks(node.children) : []),
  ]);
}

export type NodeKind =
  | 'vstack'
  | 'hstack'
  | 'list'
  | 'form'
  | 'section'
  | 'text'
  | 'button'
  | 'toggle'
  | 'textfield'
  | 'navigation-link'
  | 'image'
  | 'divider'
  | 'spacer';

export type ButtonRole = 'normal' | 'destructive' | 'cancel';
export type GlassStyle = 'regular' | 'clear';
export type ColorScheme = 'system' | 'light' | 'dark';
export type AccentColor = 'blue' | 'purple' | 'pink' | 'orange' | 'green';

export interface DocumentAppearance {
  colorScheme: ColorScheme;
  accentColor: AccentColor;
}

export interface BaseNode {
  id: string;
  kind: NodeKind;
  label?: string;
  children?: CanvasNode[];
  glass?: GlassStyle;
}

export interface TextNode extends BaseNode {
  kind: 'text';
  text: string;
  fontSize: number;
  weight: 'regular' | 'medium' | 'semibold' | 'bold';
}

export interface ButtonNode extends BaseNode {
  kind: 'button';
  label: string;
  role: ButtonRole;
  minHeight: number;
}

export interface ToggleNode extends BaseNode {
  kind: 'toggle';
  label: string;
  binding: string;
  minHeight: number;
}

export interface TextFieldNode extends BaseNode {
  kind: 'textfield';
  label: string;
  binding: string;
  minHeight: number;
}

export interface NavigationLinkNode extends BaseNode {
  kind: 'navigation-link';
  label: string;
  destinationScreenId: string;
  minHeight: number;
}

export interface ImageNode extends BaseNode {
  kind: 'image';
  systemName: string;
  accessibilityLabel: string;
}

export interface ContainerNode extends BaseNode {
  kind: 'vstack' | 'hstack' | 'list' | 'form' | 'section';
  spacing?: number;
  title?: string;
  children: CanvasNode[];
}

export interface DividerNode extends BaseNode {
  kind: 'divider';
}

export interface SpacerNode extends BaseNode {
  kind: 'spacer';
}

export type CanvasNode =
  | TextNode
  | ButtonNode
  | ToggleNode
  | TextFieldNode
  | NavigationLinkNode
  | ImageNode
  | ContainerNode
  | DividerNode
  | SpacerNode;

export interface CanvasScreen {
  id: string;
  name: string;
  navigationTitle: string;
  root: ContainerNode;
}

export interface CanvasDocument {
  version: 1;
  name: string;
  platform: 'iOS';
  minimumOS: '26.0';
  appearance: DocumentAppearance;
  screens: CanvasScreen[];
  activeScreenId: string;
}

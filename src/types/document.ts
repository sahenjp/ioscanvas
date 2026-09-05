export type NodeKind =
  | 'vstack'
  | 'hstack'
  | 'section'
  | 'text'
  | 'button'
  | 'toggle'
  | 'textfield'
  | 'divider'
  | 'spacer';

export type ButtonRole = 'normal' | 'destructive' | 'cancel';

export interface BaseNode {
  id: string;
  kind: NodeKind;
  label?: string;
  children?: CanvasNode[];
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

export interface ContainerNode extends BaseNode {
  kind: 'vstack' | 'hstack' | 'section';
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
  screens: CanvasScreen[];
  activeScreenId: string;
}

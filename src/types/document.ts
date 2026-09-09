export type NodeKind =
  | 'vstack'
  | 'hstack'
  | 'lazyvstack'
  | 'lazyhstack'
  | 'zstack'
  | 'navigation-split-view'
  | 'glass-container'
  | 'group'
  | 'tabview'
  | 'disclosure-group'
  | 'sheet'
  | 'groupbox'
  | 'lazyvgrid'
  | 'lazyhgrid'
  | 'scrollview'
  | 'list'
  | 'form'
  | 'section'
  | 'text'
  | 'button'
  | 'alert'
  | 'confirmation-dialog'
  | 'toggle'
  | 'textfield'
  | 'searchfield'
  | 'securefield'
  | 'texteditor'
  | 'picker'
  | 'colorpicker'
  | 'slider'
  | 'stepper'
  | 'menu'
  | 'progress'
  | 'gauge'
  | 'content-unavailable'
  | 'navigation-link'
  | 'label'
  | 'link'
  | 'datepicker'
  | 'image'
  | 'camera'
  | 'map'
  | 'divider'
  | 'spacer';

export type ButtonRole = 'normal' | 'destructive' | 'cancel';
export type ButtonStyle = 'automatic' | 'plain' | 'bordered' | 'borderedProminent';
export type GlassStyle = 'regular' | 'clear' | 'prominent';
export type GlassShape = 'automatic' | 'capsule' | 'rounded' | 'circle';
export type FontDesign = 'default' | 'rounded' | 'serif' | 'monospaced';
export type TextStyle = 'custom' | 'largeTitle' | 'title' | 'title2' | 'title3' | 'headline' | 'body' | 'callout' | 'subheadline' | 'footnote' | 'caption' | 'caption2';
export type TextAlignment = 'leading' | 'center' | 'trailing';
export type StackAlignment = 'leading' | 'center' | 'trailing' | 'top' | 'bottom';
export type FrameWidth = 'fit' | 'max';
export type BackgroundStyle = 'none' | 'secondary' | 'tertiary' | 'accent' | 'material';
export type ShadowStyle = 'none' | 'subtle' | 'medium';
export type ProgressStyle = 'linear' | 'circular';
export type CardImagePosition = 'top' | 'leading' | 'trailing' | 'background';
export type CardContentAlignment = 'start' | 'center' | 'end';
export type ColorScheme = 'system' | 'light' | 'dark';
export type AccentColor = 'blue' | 'purple' | 'pink' | 'orange' | 'green';
export type AppearanceAccentColor = AccentColor | 'custom';
export type NavigationTitleDisplayMode = 'automatic' | 'inline' | 'large';
export type ContentPlacement = 'top' | 'center' | 'bottom' | 'spread';
export type NavigationTransition = 'slide' | 'slideLeft' | 'slideUp' | 'slideDown' | 'fade' | 'expand' | 'none';
export type ScreenBackground = 'surface' | 'surfaceContainerLow' | 'surfaceContainer' | 'surfaceContainerHigh' | 'surfaceContainerHighest' | 'primaryContainer' | 'secondaryContainer' | 'tertiaryContainer' | 'primary' | 'inverseSurface';
export type ScreenDevice = 'iphone-se' | 'iphone-16' | 'ipad-mini' | 'ipad-pro-11';
export type ScreenOrientation = 'portrait' | 'landscape';
export type ToolbarPlacement = 'topBarLeading' | 'topBarTrailing' | 'bottomBar';
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type PatternId = 'glass-card' | 'settings-section' | 'list-row' | 'empty-state';
export type ImageSource = 'symbol' | 'asset' | 'remote';
export type M3ePresentationKind =
  | 'box'
  | 'button'
  | 'iconButton'
  | 'fab'
  | 'extendedFab'
  | 'chip'
  | 'topAppBar'
  | 'bottomNav'
  | 'navRail'
  | 'searchBar'
  | 'card'
  | 'listItem'
  | 'dialog'
  | 'snackbar'
  | 'textField'
  | 'select'
  | 'switch'
  | 'checkbox'
  | 'slider'
  | 'text'
  | 'image'
  | 'camera'
  | 'map'
  | 'divider'
  | 'loadingIndicator'
  | 'linearProgress'
  | 'circularProgress'
  | 'splitButton'
  | 'fabMenu'
  | 'toolbar'
  | 'tabs'
  | 'radio'
  | 'badge';
export type M3eInsertKind = Exclude<M3ePresentationKind, 'topAppBar' | 'bottomNav' | 'navRail'>;
export type M3eScreenPartKind = Extract<M3ePresentationKind, 'topAppBar' | 'bottomNav' | 'navRail'>;
export type M3eVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type M3eTextColor = 'primary' | 'secondary' | 'onSurface' | 'onSurfaceVariant' | 'onPrimaryContainer' | 'onSecondaryContainer' | 'onTertiaryContainer' | 'inverseOnSurface';

export interface M3eTab {
  label: string;
  icon: string | null;
}

export interface M3eAction {
  to: string;
  transition: NavigationTransition;
}

export interface M3eMenuAction {
  destinationScreenId?: string;
  navigationAction?: 'back';
  navigationTransition?: NavigationTransition;
}

export interface M3eToggleAppearance {
  icon?: string | null;
  variant?: M3eVariant;
  label?: string;
}

export interface M3eCorners {
  tl: number;
  tr: number;
  bl: number;
  br: number;
}

/** M3E fields that do not all have a direct SwiftUI equivalent. */
export interface M3eItemMetadata {
  supporting?: string;
  icon?: string | null;
  icon2?: string | null;
  size?: number;
  size2?: number;
  minimum?: number;
  maximum?: number;
  step?: number;
  value?: number;
  bold?: boolean;
  note?: string;
  radiusTop?: number;
  radiusBottom?: number;
  corners?: M3eCorners;
  tabs?: M3eTab[];
  selected?: number;
  action?: M3eAction;
  actions?: Record<string, M3eAction>;
  checked?: boolean;
  switch?: boolean;
  noCheck?: boolean;
  noImage?: boolean;
  imagePos?: CardImagePosition;
  imageSize?: number;
  contentAlign?: CardContentAlignment;
  textColor?: M3eTextColor;
  fill?: ScreenBackground;
  iconFill?: ScreenBackground | 'none';
  src?: string;
  wavy?: boolean;
  trackThickness?: number;
  contained?: boolean;
  railExpanded?: boolean;
  railModal?: boolean;
  railExpansionSide?: 'left' | 'right';
  toggle?: M3eToggleAppearance;
  noteHistory?: string[];
}

export interface DocumentAppearance {
  colorScheme: ColorScheme;
  accentColor: AppearanceAccentColor;
  accentHex?: string;
  fontDesign?: FontDesign;
}

export interface BaseNode {
  id: string;
  kind: NodeKind;
  notes?: string;
  label?: string;
  tabTitle?: string;
  tabSystemName?: string;
  children?: CanvasNode[];
  glass?: GlassStyle;
  glassInteractive?: boolean;
  glassTint?: AccentColor;
  glassShape?: GlassShape;
  padding?: number;
  frameWidth?: FrameWidth;
  background?: BackgroundStyle;
  cornerRadius?: number;
  overlay?: boolean;
  shadow?: ShadowStyle;
  navigationAction?: 'back';
  navigationTransition?: NavigationTransition;
  m3eKind?: M3ePresentationKind;
  m3eVariant?: M3eVariant;
  m3eIcon?: string;
  m3eIcon2?: string | null;
  m3eMetadata?: M3eItemMetadata;
  m3eMenuActions?: Record<string, M3eMenuAction>;
}

export interface TextNode extends BaseNode {
  kind: 'text';
  text: string;
  fontSize: number;
  weight: 'regular' | 'medium' | 'semibold' | 'bold';
  textStyle?: TextStyle;
  fontDesign?: FontDesign;
  textAlignment?: TextAlignment;
  lineLimit?: number;
}

export interface ButtonNode extends BaseNode {
  kind: 'button';
  label: string;
  accessibilityLabel?: string;
  systemName?: string;
  destinationScreenId?: string;
  role: ButtonRole;
  buttonStyle?: ButtonStyle;
  toggle?: ButtonToggle;
  minHeight: number;
}

export interface AlertAction {
  label: string;
  role: ButtonRole;
  destinationScreenId?: string;
  navigationAction?: 'back';
  navigationTransition?: NavigationTransition;
}

export interface AlertNode extends BaseNode {
  kind: 'alert';
  label: string;
  title: string;
  message: string;
  primaryButton: string;
  primaryRole: ButtonRole;
  secondaryButton?: string;
  secondaryRole?: ButtonRole;
  actions?: AlertAction[];
  minHeight: number;
}

export interface ConfirmationDialogNode extends BaseNode {
  kind: 'confirmation-dialog';
  label: string;
  title: string;
  message: string;
  options: string[];
  cancelButton?: string;
  minHeight: number;
}

export interface ButtonToggle {
  isOn: boolean;
  onLabel: string;
  onSystemName?: string;
  onButtonStyle?: ButtonStyle;
}

export interface ToggleNode extends BaseNode {
  kind: 'toggle';
  label: string;
  binding: string;
  isOn?: boolean;
  minHeight: number;
}

export interface TextFieldNode extends BaseNode {
  kind: 'textfield';
  label: string;
  binding: string;
  minHeight: number;
}

export interface SearchFieldNode extends BaseNode {
  kind: 'searchfield';
  label: string;
  binding: string;
  prompt: string;
  minHeight: number;
}

export interface SecureFieldNode extends BaseNode {
  kind: 'securefield';
  label: string;
  binding: string;
  minHeight: number;
}

export interface TextEditorNode extends BaseNode {
  kind: 'texteditor';
  label: string;
  binding: string;
  minHeight: number;
}

export interface PickerNode extends BaseNode {
  kind: 'picker';
  label: string;
  binding: string;
  options: string[];
  initialOption?: string;
  minHeight: number;
}

export interface ColorPickerNode extends BaseNode {
  kind: 'colorpicker';
  label: string;
  binding: string;
  color: string;
  minHeight: number;
}

export interface SliderNode extends BaseNode {
  kind: 'slider';
  label: string;
  binding: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  minHeight: number;
}

export interface StepperNode extends BaseNode {
  kind: 'stepper';
  label: string;
  binding: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  minHeight: number;
}

export interface MenuNode extends BaseNode {
  kind: 'menu';
  label: string;
  options: string[];
  minHeight: number;
}

export interface ProgressNode extends BaseNode {
  kind: 'progress';
  label: string;
  value: number;
  style?: ProgressStyle;
  indeterminate?: boolean;
  wavy?: boolean;
  trackThickness?: number;
}

export interface GaugeNode extends BaseNode {
  kind: 'gauge';
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  minHeight: number;
}

export interface ContentUnavailableNode extends BaseNode {
  kind: 'content-unavailable';
  title: string;
  systemName: string;
  description: string;
}

export interface NavigationLinkNode extends BaseNode {
  kind: 'navigation-link';
  label: string;
  destinationScreenId: string;
  minHeight: number;
}

export interface LabelNode extends BaseNode {
  kind: 'label';
  title: string;
  systemName: string;
  accessibilityLabel: string;
}

export interface LinkNode extends BaseNode {
  kind: 'link';
  label: string;
  url: string;
  minHeight: number;
}

export interface DatePickerNode extends BaseNode {
  kind: 'datepicker';
  label: string;
  binding: string;
  minHeight: number;
}

export interface ImageNode extends BaseNode {
  kind: 'image';
  systemName: string;
  accessibilityLabel: string;
  source?: ImageSource;
}

export interface CameraNode extends BaseNode {
  kind: 'camera';
  label: string;
  minHeight: number;
}

export interface MapNode extends BaseNode {
  kind: 'map';
  label: string;
}

export interface ToolbarItem {
  id: string;
  title: string;
  systemName?: string;
  m3eIcon?: string | null;
  placement: ToolbarPlacement;
  role?: ButtonRole;
  selected?: boolean;
  destinationScreenId?: string;
  navigationAction?: 'back';
  navigationTransition?: NavigationTransition;
}

export interface ContainerNode extends BaseNode {
  kind: 'vstack' | 'hstack' | 'lazyvstack' | 'lazyhstack' | 'zstack' | 'navigation-split-view' | 'glass-container' | 'group' | 'tabview' | 'disclosure-group' | 'sheet' | 'groupbox' | 'lazyvgrid' | 'lazyhgrid' | 'scrollview' | 'list' | 'form' | 'section';
  spacing?: number;
  alignment?: StackAlignment;
  title?: string;
  columns?: number;
  rows?: number;
  selectedIndex?: number;
  railExpanded?: boolean;
  railModal?: boolean;
  isBottomSheet?: boolean;
  cardImagePosition?: CardImagePosition;
  cardImageSize?: number;
  cardContentAlignment?: CardContentAlignment;
  cardNoImage?: boolean;
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
  | AlertNode
  | ConfirmationDialogNode
  | ToggleNode
  | TextFieldNode
  | SearchFieldNode
  | SecureFieldNode
  | TextEditorNode
  | PickerNode
  | ColorPickerNode
  | SliderNode
  | StepperNode
  | MenuNode
  | ProgressNode
  | GaugeNode
  | ContentUnavailableNode
  | NavigationLinkNode
  | LabelNode
  | LinkNode
  | DatePickerNode
  | ImageNode
  | CameraNode
  | MapNode
  | ContainerNode
  | DividerNode
  | SpacerNode;

export interface CanvasScreen {
  id: string;
  name: string;
  navigationTitle: string;
  notes?: string;
  navigationTitleDisplayMode?: NavigationTitleDisplayMode;
  contentPlacement?: ContentPlacement;
  background?: ScreenBackground;
  previewDevice?: ScreenDevice;
  previewOrientation?: ScreenOrientation;
  toolbarItems?: ToolbarItem[];
  tabBarItems?: ToolbarItem[];
  m3eTopAppBar?: M3eItemMetadata;
  m3eBottomNav?: M3eItemMetadata;
  swipe?: Partial<Record<SwipeDirection, string>>;
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

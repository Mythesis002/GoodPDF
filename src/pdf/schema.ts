// PDF schema and types for granular design control

export type Unit = number;
export type Length = Unit;

export type ColorSpace = 'rgb' | 'cmyk' | 'gray';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
export type TextAlign = 'left' | 'right' | 'center' | 'justify';
export type PositionMode = 'absolute' | 'relative';
export type ObjectFit = 'fill' | 'contain' | 'cover' | 'none';
export type PageSizePreset = 'A4' | 'Letter' | 'Legal';

export interface PDFTextFontSource {
  url?: string;
  fileId?: string;
  dataKey?: string;
}

export interface PDFTextFont {
  family: string;
  weight?: number | 'normal' | 'bold';
  style?: 'normal' | 'italic';
  variant?: 'normal' | 'small-caps';
  source?: PDFTextFontSource;
}

export interface PDFTextDecoration {
  underline?: boolean;
  overline?: boolean;
  lineThrough?: boolean;
  decorationColor?: string;
  decorationThickness?: Length;
}

export interface PDFTextStroke {
  width?: Length;
  color?: string;
}

export interface PDFTextGradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

export interface PDFTextGradientFill {
  type: 'linear' | 'radial';
  angle?: number;
  stops: PDFTextGradientStop[];
}

export interface ParagraphStyle {
  align?: TextAlign;
  indentFirstLine?: Length;
  indentLeft?: Length;
  indentRight?: Length;
  spacingBefore?: Length;
  spacingAfter?: Length;
  hyphenation?: 'off' | 'soft' | 'aggressive';
  keepWithNext?: boolean;
  keepLinesTogether?: boolean;
}

export interface PDFTextStyle {
  font: PDFTextFont;
  fontSize: Length;
  kerning?: number;
  tracking?: number;
  leading?: Length;
  color?: string;
  opacity?: number;
  decorations?: PDFTextDecoration;
  stroke?: PDFTextStroke;
  gradientFill?: PDFTextGradientFill;
  paragraph?: ParagraphStyle;
}

export interface BoxSides<T = Length> {
  top?: T;
  right?: T;
  bottom?: T;
  left?: T;
}

export interface BoxBorder {
  width?: BoxSides<Length>;
  color?: BoxSides<string>;
  style?: BoxSides<'solid' | 'dashed' | 'dotted' | 'none'>;
  radius?: BoxSides<Length>;
}

export interface BoxBackgroundImage {
  src: string;
  repeat?: 'no-repeat' | 'repeat-x' | 'repeat-y' | 'repeat';
  size?: 'cover' | 'contain' | { width: Length; height: Length };
  position?: { x: Length; y: Length };
  opacity?: number;
}

export interface BoxGradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

export interface BoxGradientBackground {
  type: 'linear' | 'radial';
  angle?: number;
  stops: BoxGradientStop[];
}

export interface BoxShadow {
  offsetX: Length;
  offsetY: Length;
  blurRadius?: Length;
  spreadRadius?: Length;
  color: string;
  opacity?: number;
}

export interface BoxTransform {
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  originX?: Length;
  originY?: Length;
}

export interface BoxLayout {
  position?: PositionMode;
  x?: Length;
  y?: Length;
  width?: Length;
  height?: Length;
  margin?: BoxSides;
  padding?: BoxSides;
  zIndex?: number;
  flex?: {
    direction?: 'row' | 'column';
    justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
    align?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
    grow?: number;
    shrink?: number;
    basis?: Length | 'auto';
  };
  backgroundColor?: string;
  backgroundGradient?: BoxGradientBackground;
  backgroundImage?: BoxBackgroundImage;
  border?: BoxBorder;
  opacity?: number;
  blendMode?: BlendMode;
  transform?: BoxTransform;
}

export interface PDFImageElementData {
  src: string;
  alt?: string;
  objectFit?: ObjectFit;
  borderRadius?: Length | BoxSides<Length>;
  opacity?: number;
  shadow?: BoxShadow;
  blendMode?: BlendMode;
}

export interface PDFShapeStroke {
  color?: string;
  width?: Length;
  dashArray?: Length[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

export interface PDFShapeFill {
  color?: string;
  gradient?: BoxGradientBackground;
  opacity?: number;
}

export type PrimitiveShapeType = 'rect' | 'circle' | 'line' | 'polygon' | 'path';

export interface PDFVectorShapeElementData {
  shapeType: PrimitiveShapeType;
  pathData?: string;
  points?: { x: Length; y: Length }[];
  rx?: Length;
  ry?: Length;
  stroke?: PDFShapeStroke;
  fill?: PDFShapeFill;
}

export interface PDFTextElementData {
  text: string;
  style: PDFTextStyle;
}

export type PDFElementType = 'box' | 'text' | 'image' | 'shape';

export interface PDFElementBase {
  id: string;
  type: PDFElementType;
  layout: BoxLayout;
  meta?: Record<string, unknown>;
}

export interface PDFBoxElement extends PDFElementBase {
  type: 'box';
  children?: PDFElement[];
}

export interface PDFTextElement extends PDFElementBase {
  type: 'text';
  text: PDFTextElementData;
}

export interface PDFImageElement extends PDFElementBase {
  type: 'image';
  image: PDFImageElementData;
}

export interface PDFShapeElement extends PDFElementBase {
  type: 'shape';
  shape: PDFVectorShapeElementData;
}

export type PDFElement = PDFBoxElement | PDFTextElement | PDFImageElement | PDFShapeElement;

export interface PDFPageSize {
  preset?: PageSizePreset;
  width?: Length;
  height?: Length;
}

export interface PDFColorProfile {
  space: ColorSpace;
  profileName?: string;
  iccProfileId?: string;
}

export interface PDFMetadata {
  title?: string;
  subject?: string;
  author?: string;
  creator?: string;
  keywords?: string[];
}

export interface PDFPage {
  id: string;
  size: PDFPageSize;
  backgroundColor?: string;
  backgroundImage?: BoxBackgroundImage;
  elements: PDFElement[];
}

export interface PDFDocument {
  id: string;
  version: string;
  pages: PDFPage[];
  metadata?: PDFMetadata;
  colorProfile?: PDFColorProfile;
  fonts?: PDFTextFontSource[];
  renderOptions?: {
    defaultDpi?: number;
    compression?: 'none' | 'fast' | 'max';
    embedFonts?: boolean;
  };
  meta?: Record<string, unknown>;
}

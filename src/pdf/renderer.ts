// Engine-agnostic PDF renderer stubs for the granular PDF schema

import type {
  PDFDocument,
  PDFElement,
  PDFBoxElement,
  PDFTextElement,
  PDFImageElement,
  PDFShapeElement,
  PDFPageSize,
} from './schema';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Minimal interface your concrete PDF backend (pdf-lib, PDFKit, etc.) must implement
export interface PdfContext {
  beginDocument(options: {
    metadata?: PDFDocument['metadata'];
    colorProfile?: PDFDocument['colorProfile'];
    dpi: number;
  }): void;

  endDocument(): Promise<Uint8Array>;

  beginPage(options: { width: number; height: number }): void;
  endPage(): void;

  saveState(): void;
  restoreState(): void;

  // box / drawing primitives
  drawRect(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor?: string;
    gradient?: unknown;
  }): void;

  drawBackgroundImage(frame: Rect, bg: unknown): void;
  strokeBorders(frame: Rect, border: unknown): void;

  applyTransform(transform: unknown | undefined): void;
  setGlobalOpacity(value: number): void;
  setBlendMode(mode: string): void;

  // text
  setFont(font: unknown): void;
  setFontSize(size: number): void;
  setFillColor(color: string): void;
  setOpacity(value: number): void;
  setTextGradient(gradient: unknown, frame: Rect): void;
  setTextStroke(width: number, color: string): void;
  drawText(options: {
    text: string;
    frame: Rect;
    align?: string;
    leading?: number;
    tracking?: number;
    kerning?: number;
    paragraph?: unknown;
    decorations?: unknown;
  }): void;

  // images
  computeObjectFit(frame: Rect, objectFit: string): Rect;
  drawShadow(frame: Rect, shadow: unknown): void;
  drawImage(options: {
    src: string;
    frame: Rect;
    borderRadius?: unknown;
  }): void;

  // shapes
  setShapeStroke(stroke: unknown): void;
  setShapeFill(fill: unknown): void;
  drawShape(options: {
    frame: Rect;
    type: string;
    pathData?: string;
    points?: { x: number; y: number }[];
    rx?: number;
    ry?: number;
  }): void;
}

// LayoutContext is responsible for resolving BoxLayout into absolute frames
export class LayoutContext {
  constructor(private dpi: number) {}

  computeFrame(layout: { x?: number; y?: number; width?: number; height?: number }): Rect {
    const x = layout.x ?? 0;
    const y = layout.y ?? 0;
    const width = layout.width ?? 0;
    const height = layout.height ?? 0;
    return { x, y, width, height };
  }

  createChildContext(frame: Rect, _layout: unknown): LayoutContext {
    // Placeholder: extend to handle relative / flex layouts
    return new LayoutContext(this.dpi);
  }
}

export function resolvePageSize(size: PDFPageSize, _dpi: number): { width: number; height: number } {
  const presetMap: Record<string, { wPt: number; hPt: number }> = {
    A4: { wPt: 595.28, hPt: 841.89 },
    Letter: { wPt: 612, hPt: 792 },
    Legal: { wPt: 612, hPt: 1008 },
  };

  const base =
    size.preset && presetMap[size.preset]
      ? presetMap[size.preset]
      : { wPt: size.width ?? 595.28, hPt: size.height ?? 841.89 };

  return { width: base.wPt, height: base.hPt };
}

export async function renderPDFDocument(
  doc: PDFDocument,
  targetDpi: number,
  engine: PdfContext,
): Promise<Uint8Array> {
  engine.beginDocument({
    metadata: doc.metadata,
    colorProfile: doc.colorProfile,
    dpi: targetDpi,
  });

  for (const page of doc.pages) {
    const { width, height } = resolvePageSize(page.size, targetDpi);
    engine.beginPage({ width, height });

    const layoutCtx = new LayoutContext(targetDpi);

    if (page.backgroundColor || page.backgroundImage) {
      // draw simple full-page background; advanced page backgrounds can use regular elements
      engine.drawRect({
        x: 0,
        y: 0,
        width,
        height,
        fillColor: page.backgroundColor,
        gradient: undefined,
      });
      if (page.backgroundImage) {
        engine.drawBackgroundImage({ x: 0, y: 0, width, height }, page.backgroundImage as unknown);
      }
    }

    const elements = [...page.elements].sort(
      (a, b) => (a.layout.zIndex ?? 0) - (b.layout.zIndex ?? 0),
    );

    for (const el of elements) {
      renderElement(engine, el, layoutCtx);
    }

    engine.endPage();
  }

  return engine.endDocument();
}

export function renderElement(engine: PdfContext, element: PDFElement, ctx: LayoutContext): void {
  const frame = ctx.computeFrame(element.layout);
  engine.saveState();

  // Visuals handled in the concrete engine using layout information if desired

  switch (element.type) {
    case 'box':
      renderBoxElement(engine, element as PDFBoxElement, ctx, frame);
      break;
    case 'text':
      renderTextElement(engine, element as PDFTextElement, frame);
      break;
    case 'image':
      renderImageElement(engine, element as PDFImageElement, frame);
      break;
    case 'shape':
      renderShapeElement(engine, element as PDFShapeElement, frame);
      break;
  }

  engine.restoreState();
}

function renderBoxElement(
  engine: PdfContext,
  box: PDFBoxElement,
  ctx: LayoutContext,
  frame: Rect,
): void {
  if (!box.children || box.children.length === 0) return;
  const childCtx = ctx.createChildContext(frame, box.layout);
  const sorted = [...box.children].sort(
    (a, b) => (a.layout.zIndex ?? 0) - (b.layout.zIndex ?? 0),
  );
  for (const child of sorted) {
    renderElement(engine, child, childCtx);
  }
}

function renderTextElement(engine: PdfContext, el: PDFTextElement, frame: Rect): void {
  const { text, style } = el.text;
  engine.setFont(style.font as unknown);
  engine.setFontSize(style.fontSize);
  engine.setFillColor(style.color ?? '#000000');
  engine.setOpacity(style.opacity ?? 1);

  if (style.gradientFill) {
    engine.setTextGradient(style.gradientFill as unknown, frame);
  }

  if (style.stroke) {
    engine.setTextStroke(style.stroke.width ?? 0, style.stroke.color ?? '#000000');
  }

  engine.drawText({
    text,
    frame,
    align: style.paragraph?.align ?? 'left',
    leading: style.leading,
    tracking: style.tracking,
    kerning: style.kerning,
    paragraph: style.paragraph as unknown,
    decorations: style.decorations as unknown,
  });
}

function renderImageElement(engine: PdfContext, el: PDFImageElement, frame: Rect): void {
  const img = el.image;
  engine.setOpacity(img.opacity ?? 1);
  engine.setBlendMode(img.blendMode ?? 'normal');

  const fitted = engine.computeObjectFit(frame, img.objectFit ?? 'cover');

  if (img.shadow) {
    engine.drawShadow(fitted, img.shadow as unknown);
  }

  engine.drawImage({
    src: img.src,
    frame: fitted,
    borderRadius: img.borderRadius as unknown,
  });
}

function renderShapeElement(engine: PdfContext, el: PDFShapeElement, frame: Rect): void {
  const { shape } = el;
  engine.setShapeStroke(shape.stroke as unknown);
  engine.setShapeFill(shape.fill as unknown);
  engine.drawShape({
    frame,
    type: shape.shapeType,
    pathData: shape.pathData,
    points: shape.points,
    rx: shape.rx,
    ry: shape.ry,
  });
}

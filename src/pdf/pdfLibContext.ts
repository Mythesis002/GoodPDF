import type { PdfContext, Rect } from './renderer';

// Stub implementation of PdfContext which can later be wired to a real PDF engine
// like pdf-lib or PDFKit. This avoids introducing external runtime dependencies
// while keeping the Pro rendering pipeline pluggable.

export class PdfLibContextStub implements PdfContext {
  beginDocument(): void {}

  async endDocument(): Promise<Uint8Array> {
    // Return an empty PDF payload placeholder
    return new Uint8Array();
  }

  beginPage(_options: { width: number; height: number }): void {}
  endPage(): void {}

  saveState(): void {}
  restoreState(): void {}

  drawRect(_options: { x: number; y: number; width: number; height: number; fillColor?: string; gradient?: unknown }): void {}

  drawBackgroundImage(_frame: Rect, _bg: unknown): void {}
  strokeBorders(_frame: Rect, _border: unknown): void {}

  applyTransform(_transform: unknown | undefined): void {}
  setGlobalOpacity(_value: number): void {}
  setBlendMode(_mode: string): void {}

  setFont(_font: unknown): void {}
  setFontSize(_size: number): void {}
  setFillColor(_color: string): void {}
  setOpacity(_value: number): void {}
  setTextGradient(_gradient: unknown, _frame: Rect): void {}
  setTextStroke(_width: number, _color: string): void {}

  drawText(_options: { text: string; frame: Rect; align?: string; leading?: number; tracking?: number; kerning?: number; paragraph?: unknown; decorations?: unknown }): void {}

  computeObjectFit(frame: Rect, _objectFit: string): Rect {
    return frame;
  }

  drawShadow(_frame: Rect, _shadow: unknown): void {}

  drawImage(_options: { src: string; frame: Rect; borderRadius?: unknown }): void {}

  setShapeStroke(_stroke: unknown): void {}
  setShapeFill(_fill: unknown): void {}
  drawShape(_options: { frame: Rect; type: string; pathData?: string; points?: { x: number; y: number }[]; rx?: number; ry?: number }): void {}
}

// Note: pdf-lib implementation commented out due to missing dependency
// Uncomment when pdf-lib is properly installed
/*
import { PDFDocument as PdfLibDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PdfContext, Rect } from './renderer';

// Minimal pdf-lib based implementation of PdfContext focused on text and boxes.

export class PdfLibContext implements PdfContext {
  private doc: PdfLibDocument | null = null;
  private currentPage: any = null;

  async init(): Promise<void> {
    if (!this.doc) {
      this.doc = await PdfLibDocument.create();
    }
  }

  beginDocument(): void {
    // no-op: doc is created lazily via init()
  }

  async endDocument(): Promise<Uint8Array> {
    if (!this.doc) {
      this.doc = await PdfLibDocument.create();
    }
    return this.doc.save();
  }

  beginPage(options: { width: number; height: number }): void {
    if (!this.doc) {
      throw new Error('Document not initialized');
    }
    this.currentPage = this.doc.addPage([options.width, options.height]);
  }

  endPage(): void {
    // pdf-lib pages are finalized automatically
  }

  saveState(): void {}
  restoreState(): void {}

  drawRect(options: { x: number; y: number; width: number; height: number; fillColor?: string; gradient?: unknown; }): void {
    if (!this.currentPage) return;
    const yFromTop = this.currentPage.getHeight() - options.y - options.height;
    if (options.fillColor) {
      const c = parseColor(options.fillColor);
      this.currentPage.drawRectangle({
        x: options.x,
        y: yFromTop,
        width: options.width,
        height: options.height,
        color: c,
      });
    }
  }

  drawBackgroundImage(_frame: Rect, _bg: unknown): void {}
  strokeBorders(_frame: Rect, _border: unknown): void {}

  applyTransform(_transform: unknown | undefined): void {}
  setGlobalOpacity(_value: number): void {}
  setBlendMode(_mode: string): void {}

  setFont(_font: unknown): void {}
  setFontSize(_size: number): void {}
  setFillColor(_color: string): void {}
  setOpacity(_value: number): void {}
  setTextGradient(_gradient: unknown, _frame: Rect): void {}
  setTextStroke(_width: number, _color: string): void {}

  drawText(options: { text: string; frame: Rect; align?: string; leading?: number; tracking?: number; kerning?: number; paragraph?: unknown; decorations?: unknown; }): void {
    if (!this.currentPage) return;
    const fontSize = 12;
    const yFromTop = this.currentPage.getHeight() - options.frame.y - fontSize;

    this.currentPage.drawText(options.text, {
      x: options.frame.x,
      y: yFromTop,
      size: fontSize,
      font: this.currentPage.doc?.embedStandardFont(StandardFonts.Helvetica) as any,
      color: rgb(0, 0, 0),
      maxWidth: options.frame.width,
    });
  }

  computeObjectFit(frame: Rect, _objectFit: string): Rect {
    return frame;
  }

  drawShadow(_frame: Rect, _shadow: unknown): void {}

  drawImage(_options: { src: string; frame: Rect; borderRadius?: unknown }): void {
    // Images can be implemented here by embedding the image bytes via pdf-lib
  }

  setShapeStroke(_stroke: unknown): void {}
  setShapeFill(_fill: unknown): void {}
  drawShape(_options: { frame: Rect; type: string; pathData?: string; points?: { x: number; y: number }[]; rx?: number; ry?: number }): void {}
}

function parseColor(_color: string) {
  // Very simple: always return black for now; can be expanded to parse hex/rgb
  return rgb(0, 0, 0);
}
*/

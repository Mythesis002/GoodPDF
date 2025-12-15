import type { PdfContext, Rect } from './renderer';

export class JsPdfContext implements PdfContext {
  private doc: any;
  private orientation: 'p' | 'l';

  constructor(orientation: 'p' | 'l' = 'p') {
    this.orientation = orientation;
  }

  beginDocument(): void {
    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) {
      throw new Error('jsPDF is not loaded on window.jspdf');
    }
    this.doc = new jsPDF(this.orientation, 'pt', 'a4');
  }

  async endDocument(): Promise<Uint8Array> {
    if (!this.doc) {
      return new Uint8Array();
    }
    const buffer = this.doc.output('arraybuffer') as ArrayBuffer;
    return new Uint8Array(buffer);
  }

  beginPage(options: { width: number; height: number }): void {
    if (!this.doc) return;
    if (this.doc.getNumberOfPages() === 0) {
      this.doc.setPage(1);
      this.doc.setPageDimensions([options.width, options.height]);
    } else {
      this.doc.addPage([options.width, options.height], this.orientation);
    }
  }

  endPage(): void {}

  saveState(): void {}
  restoreState(): void {}

  drawRect(options: { x: number; y: number; width: number; height: number; fillColor?: string; gradient?: unknown }): void {
    if (!this.doc) return;
    if (options.fillColor) {
      this.setFillColor(options.fillColor);
      this.doc.rect(options.x, options.y, options.width, options.height, 'F');
    }
  }

  drawBackgroundImage(_frame: Rect, _bg: unknown): void {}
  strokeBorders(_frame: Rect, _border: unknown): void {}

  applyTransform(_transform: unknown | undefined): void {}
  setGlobalOpacity(_value: number): void {}
  setBlendMode(_mode: string): void {}

  setFont(_font: unknown): void {}
  setFontSize(size: number): void {
    if (!this.doc) return;
    this.doc.setFontSize(size);
  }

  setFillColor(color: string): void {
    if (!this.doc) return;
    try {
      this.doc.setFillColor(color as any);
      this.doc.setTextColor(color as any);
    } catch {
      // ignore invalid colors
    }
  }

  setOpacity(_value: number): void {}
  setTextGradient(_gradient: unknown, _frame: Rect): void {}
  setTextStroke(_width: number, _color: string): void {}

  drawText(options: { text: string; frame: Rect; align?: string; leading?: number; tracking?: number; kerning?: number; paragraph?: unknown; decorations?: unknown }): void {
    if (!this.doc) return;
    const x = options.frame.x;
    const y = options.frame.y + (options.leading || 14);
    this.doc.text(options.text, x, y, {
      maxWidth: options.frame.width,
      align: (options.align as any) || 'left',
    });
  }

  computeObjectFit(frame: Rect, _objectFit: string): Rect {
    return frame;
  }

  drawShadow(_frame: Rect, _shadow: unknown): void {}

  drawImage(_options: { src: string; frame: Rect; borderRadius?: unknown }): void {}

  setShapeStroke(_stroke: unknown): void {}
  setShapeFill(_fill: unknown): void {}
  drawShape(_options: { frame: Rect; type: string; pathData?: string; points?: { x: number; y: number }[]; rx?: number; ry?: number }): void {}
}

import type { PDFDocument, PDFPage, PDFElement, PDFBoxElement, PDFTextElement, PDFTextStyle } from './schema';

// Adapter: convert existing Textora/GoodPDF internal doc into the generic PDFDocument schema.
// This is intentionally conservative but structured so you can enrich styles later.

export interface TextoraDoc {
  title?: string;
  subtitle?: string;
  design_system?: any;
  pages?: Array<{
    title?: string;
    content?: Array<any>;
  }>;
}

interface TextoraSettings {
  pages?: number;
  type?: string;
  audience?: string;
}

const A4_SIZE = { preset: 'A4' as const };

export function buildPdfDocumentFromTextora(
  source: TextoraDoc,
  settings: TextoraSettings,
  _isLandscape: boolean,
): PDFDocument {
  const pages: PDFPage[] = [];

  // Cover page as a simple layout with title/subtitle
  const coverElements: PDFElement[] = [];

  if (source.title) {
    const titleText: PDFTextElement = {
      id: 'cover-title',
      type: 'text',
      layout: {
        position: 'absolute',
        x: 72,
        y: 200,
        width: 400,
        height: 80,
      },
      text: {
        text: source.title,
        style: baseHeadingStyle(32),
      },
    };
    coverElements.push(titleText);
  }

  if (source.subtitle) {
    const subtitleText: PDFTextElement = {
      id: 'cover-subtitle',
      type: 'text',
      layout: {
        position: 'absolute',
        x: 72,
        y: 280,
        width: 420,
        height: 60,
      },
      text: {
        text: source.subtitle,
        style: baseBodyStyle(16),
      },
    };
    coverElements.push(subtitleText);
  }

  const coverPage: PDFPage = {
    id: 'page-cover',
    size: A4_SIZE,
    backgroundColor: '#ffffff',
    elements: coverElements,
  };

  pages.push(coverPage);

  // Content pages
  (source.pages || []).forEach((page, pageIndex) => {
    const elements: PDFElement[] = [];

    if (page.title) {
      const h: PDFTextElement = {
        id: `page-${pageIndex + 1}-title`,
        type: 'text',
        layout: {
          position: 'absolute',
          x: 72,
          y: 72,
          width: 450,
          height: 40,
        },
        text: {
          text: page.title,
          style: baseHeadingStyle(24),
        },
      };
      elements.push(h);
    }

    let cursorY = 130;
    const lineHeight = 20;

    (page.content || []).forEach((block, blockIndex) => {
      if (!block) return;

      const idBase = `p${pageIndex + 1}-b${blockIndex}`;

      if (block.type === 'h2') {
        const el: PDFTextElement = {
          id: `${idBase}-h2`,
          type: 'text',
          layout: {
            position: 'absolute',
            x: 72,
            y: cursorY,
            width: 450,
            height: 30,
          },
          text: {
            text: String(block.text ?? ''),
            style: baseHeadingStyle(18),
          },
        };
        elements.push(el);
        cursorY += lineHeight * 2;
      } else if (block.type === 'p') {
        const el: PDFTextElement = {
          id: `${idBase}-p`,
          type: 'text',
          layout: {
            position: 'absolute',
            x: 72,
            y: cursorY,
            width: 450,
            height: 60,
          },
          text: {
            text: String(block.text ?? ''),
            style: baseBodyStyle(12),
          },
        };
        elements.push(el);
        cursorY += lineHeight * 3;
      } else if (block.type === 'stat') {
        const box: PDFBoxElement = {
          id: `${idBase}-stat-box`,
          type: 'box',
          layout: {
            position: 'absolute',
            x: 72,
            y: cursorY,
            width: 200,
            height: 80,
            backgroundColor: '#f1f5f9',
          },
          children: [
            {
              id: `${idBase}-stat-value`,
              type: 'text',
              layout: {
                position: 'absolute',
                x: 82,
                y: cursorY + 12,
                width: 180,
                height: 30,
              },
              text: {
                text: String(block.value ?? ''),
                style: baseHeadingStyle(20),
              },
            } as PDFTextElement,
            {
              id: `${idBase}-stat-label`,
              type: 'text',
              layout: {
                position: 'absolute',
                x: 82,
                y: cursorY + 42,
                width: 180,
                height: 20,
              },
              text: {
                text: String(block.label ?? ''),
                style: baseBodyStyle(10),
              },
            } as PDFTextElement,
          ],
        };
        elements.push(box);
        cursorY += 100;
      }
      // Other block types (quote, chart, sidebar, image_prompt...) can be mapped here later.
    });

    const pdfPage: PDFPage = {
      id: `page-${pageIndex + 1}`,
      size: A4_SIZE,
      backgroundColor: '#ffffff',
      elements,
    };

    pages.push(pdfPage);
  });

  const pdfDoc: PDFDocument = {
    id: 'textora-doc',
    version: '1.0.0',
    pages,
    metadata: {
      title: source.title,
      author: settings.audience,
      subject: settings.type,
      creator: 'GoodPDF Pro',
      keywords: ['GoodPDF', 'Textora', 'Auto-generated'],
    },
    colorProfile: {
      space: 'rgb',
    },
    renderOptions: {
      defaultDpi: 300,
      compression: 'max',
      embedFonts: true,
    },
  };

  return pdfDoc;
}

function baseHeadingStyle(size: number): PDFTextStyle {
  return {
    font: {
      family: 'Inter',
      weight: 'bold',
    },
    fontSize: size,
    color: '#111827',
    leading: size * 1.2,
  };
}

function baseBodyStyle(size: number): PDFTextStyle {
  return {
    font: {
      family: 'Inter',
      weight: 'normal',
    },
    fontSize: size,
    color: '#1f2933',
    leading: size * 1.5,
  };
}

import React, { useState, useEffect, useRef } from 'react';

// Global type declarations for external libraries
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}
import { 
  FileText, Download, LayoutTemplate, 
  Loader2,
  Image as ImageIcon,
  Wand2, Monitor,
  Trash2 as Delete, FilePlus,
  MoreHorizontal, ChevronUp, ChevronDown, Zap,
  Type as TypeIcon, Book, GraduationCap as GradIcon,
  Lightbulb,
  Activity, CheckCircle, Scale,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

/**
 * GOODPDF v31.1 - STRICT PAGE FITTING ENGINE
 * -------------------------------------------
 * FIXES:
 * 1. PDF Image Export (CORS + async loading + waitForAllImages)
 * 2. STRICT page count enforcement with adaptive word budgets
 * 3. Real-time content measurement and trimming
 * 4. Dynamic font scaling to fit content exactly
 */

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // Get from environment variables

// ==========================================
// 1. CORE UTILITIES
// ==========================================

const safeJSONParse = (text: string) => {
  try {
    if (!text) return null;
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
       cleaned = cleaned.substring(firstOpen, lastClose + 1);
    }
    
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const fixed = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
      return JSON.parse(fixed);
    }
  } catch (e) {
    console.error("JSON Error", e);
    return null;
  }
};

const callAI = async (prompt: string, retries: number = 2) => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    return safeJSONParse(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (e) { 
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return callAI(prompt, retries - 1);
    }
    console.error(e);
    return null; 
  }
};

const generateImage = async (prompt: string) => {
  console.log("🎨 Image API called with prompt:", prompt.substring(0, 50));
  
  try {
    const requestBody = {
      instances: [{ 
        prompt: prompt + ", professional illustration, high quality, clean design, minimalist style, infographic style, white background, vector art" 
      }],
      parameters: { 
        sampleCount: 1,
        aspectRatio: "16:9",
        safetySetting: "block_some",
        personGeneration: "allow_adult"
      }
    };
    
    console.log("📤 Sending request to Imagen API...");
    
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );
    
    console.log("📥 Response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ API Error:", res.status, errorText);
      throw new Error(`API Error: ${res.status}`);
    }
    
    const data = await res.json();
    console.log("📦 Response data received:", data);
    
    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      console.log("✅ Base64 image found in response");
      return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
    } else {
      console.warn("⚠️ No image in API response, using fallback");
      return createFallbackSVG(prompt);
    }
  } catch (e) { 
    console.error("❌ Image generation error:", e);
    return createFallbackSVG(prompt);
  }
};

const createFallbackSVG = (prompt: string) => {
  const cleanPrompt = prompt.substring(0, 60).replace(/[<>&'"]/g, ' ');
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#grad1)" width="800" height="400"/>
      <circle cx="400" cy="160" r="50" fill="none" stroke="#adb5bd" stroke-width="3" opacity="0.5"/>
      <rect x="360" y="210" width="80" height="60" rx="4" fill="#dee2e6" opacity="0.5"/>
      <line x1="340" y1="290" x2="460" y2="290" stroke="#adb5bd" stroke-width="2"/>
      <circle cx="340" cy="290" r="4" fill="#6c757d"/>
      <circle cx="400" cy="290" r="4" fill="#6c757d"/>
      <circle cx="460" cy="290" r="4" fill="#6c757d"/>
      <text x="400" y="330" text-anchor="middle" fill="#495057" font-size="14" font-weight="600" font-family="Arial, sans-serif">
        ${cleanPrompt}
      </text>
      <text x="400" y="355" text-anchor="middle" fill="#adb5bd" font-size="12" font-family="Arial, sans-serif">
        Diagram Placeholder - Content Visualization
      </text>
    </svg>
  `)}`;
};

const loadGoogleFont = (fontFamily: string) => {
  if (!fontFamily || typeof fontFamily !== 'string') return;
  const safeFont = fontFamily.trim();
  const linkId = `font-${safeFont.replace(/\s+/g, '-')}`;
  if (!document.getElementById(linkId)) {
    try {
      const link = document.createElement('link');
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${safeFont.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,700;0,900;1,400&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    } catch (e) { console.warn("Font load error", e); }
  }
};

const countWords = (val: string | number | null | undefined) => {
  if (!val) return 0;
  const str = String(val);
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
};

// Wait for all images in the document to be fully loaded
const waitForAllImages = async () => {
  const images = Array.from(document.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve(void 0);
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
};

const safeStr = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
};

// ==========================================
// 2. STRICT PAGE MATH ENGINE
// ==========================================

/**
 * Calculate STRICT word budget based on target pages
 * This ensures content NEVER exceeds the page limit
 */
const calculatePageBudget = (targetPages: number) => {
  // Reserve pages for cover + optional TOC
  // const _hasCover = true; // Always 1 page
  const hasTOC = targetPages >= 5; // TOC only if 5+ pages
  const tocPages = hasTOC ? 1 : 0;
  
  const reservedPages = 1 + tocPages; // Cover + TOC
  const contentPages = Math.max(1, targetPages - reservedPages);
  
  // CONSERVATIVE word budget (ensures content fits)
  const WORDS_PER_PAGE = 280; // Reduced from 350 for safety margin
  const totalWordBudget = contentPages * WORDS_PER_PAGE;
  
  // Calculate sections (chapters)
  let sectionCount = Math.max(2, Math.floor(contentPages * 1.2)); // ~1.2 sections per page
  sectionCount = Math.min(sectionCount, 15); // Cap at 15 sections max
  
  // Words per section (includes all content types)
  const wordsPerSection = Math.floor(totalWordBudget / sectionCount);
  
  return {
    targetPages,
    contentPages,
    tocPages,
    hasTOC,
    sectionCount,
    totalWordBudget,
    wordsPerSection,
    wordsPerPage: WORDS_PER_PAGE
  };
};

/**
 * Calculate visual weight for layout positioning
 */
const getBlockWeight = (block: any) => {
  if (!block) return 0;
  
  const weights = {
    h2: 100,
    h3: 70,
    p: Math.ceil(countWords(String(block.text || "")) * 0.8 + 30),
    image_prompt: 320,
    stat: 200,
    key_term: 180,
    case_study: 280,
    table: 250,
    takeaway: 100,
    quote: 120
  };
  
  return weights[block.type as keyof typeof weights] || 80;
};

// ==========================================
// 3. DESIGN TEMPLATES
// ==========================================

const PRO_TEMPLATES = {
  university: {
    id: 'university',
    name: 'University Report',
    description: 'Formal, Times New Roman, Standard',
    colors: { bg: '#ffffff', text: '#000000', accent: '#000000', secondary: '#ffffff', border: '#000000' },
    fonts: { heading: 'Times New Roman', body: 'Times New Roman' },
    layout: { radius: '0px', cover_style: 'academic_formal' }
  },
  academic: {
    id: 'academic',
    name: 'Academic',
    description: 'Classic serif, clean blue accents',
    colors: { bg: '#ffffff', text: '#1e293b', accent: '#2563eb', secondary: '#f1f5f9', border: '#e2e8f0' },
    fonts: { heading: 'Merriweather', body: 'Source Serif 4' },
    layout: { radius: '2px', cover_style: 'minimal' }
  },
  modern: {
    id: 'modern',
    name: 'Modern Dark',
    description: 'High contrast, cyan highlights',
    colors: { bg: '#0f172a', text: '#f8fafc', accent: '#06b6d4', secondary: '#1e293b', border: '#334155' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { radius: '8px', cover_style: 'bold' }
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Warm tones, elegant typography',
    colors: { bg: '#fffbf0', text: '#431407', accent: '#d97706', secondary: '#fff7ed', border: '#fed7aa' },
    fonts: { heading: 'Playfair Display', body: 'Lato' },
    layout: { radius: '12px', cover_style: 'split' }
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean grayscale, strict grid',
    colors: { bg: '#ffffff', text: '#000000', accent: '#000000', secondary: '#f3f4f6', border: '#e5e7eb' },
    fonts: { heading: 'Helvetica', body: 'Arial' },
    layout: { radius: '0px', cover_style: 'typographic' }
  }
};

// ==========================================
// 4. AI CONTENT GENERATION
// ==========================================

const generateStructure = async (topic: string, type: string, pages: number, budget: any) => {
  const prompt = `
You are a Document Architect. Create a ${pages}-page ${type} outline on "${topic}".

STRICT RULES:
- Generate EXACTLY ${budget.sectionCount} sections (chapters)
- Total word budget: ${budget.totalWordBudget} words across ALL sections
- Each section gets ~${budget.wordsPerSection} words

OUTPUT (JSON only):
{
  "meta": {
    "title": "Document Title",
    "subtitle": "Brief subtitle",
    "author": "Author Name",
    "abstract": "2-3 sentence summary (max 60 words)"
  },
  "toc": ["Introduction", "Chapter 1", "Chapter 2", ..., "Conclusion"],
  "sections": [
    { "title": "Introduction", "detail": "Brief overview" },
    { "title": "Chapter 1", "detail": "Main focus" },
    { "title": "Conclusion", "detail": "Summary" }
  ]
}
  `;
  return callAI(prompt);
};

const generateSectionContent = async (section: any, topic: string, wordBudget: number) => {
  const prompt = `
Write content for section "${section.title}" in document about "${topic}".

ABSOLUTE CONSTRAINTS (MUST FOLLOW):
1. WORD LIMIT: Maximum ${wordBudget} words TOTAL for this entire section
2. PARAGRAPH LIMIT: Each paragraph must be 35-60 words only
3. BLOCK COUNT: Maximum 5 content blocks total:
   - 1 h2 (section title) - REQUIRED
   - 2-4 paragraphs (p blocks)
   - OPTIONAL: 1 additional element (key_term OR image_prompt, not both)

4. NO EXCESS CONTENT: If nearing word limit, STOP immediately

BLOCK TYPES ALLOWED:
- h2: Section heading
- p: Paragraph (35-60 words each)
- key_term: Key concept box (term + short definition, 20-30 words)
- image_prompt: ONE diagram only (desc field with clear prompt)

OUTPUT (JSON only, NO markdown):
{
  "blocks": [
    { "type": "h2", "text": "${section.title}" },
    { "type": "p", "text": "Concise paragraph..." },
    { "type": "key_term", "term": "Term", "definition": "Short definition" }
  ]
}

CRITICAL: Count words before responding. If over ${wordBudget}, remove content.
  `;
  return callAI(prompt);
};

const rewriteSectionWithAI = async (_block: any, context: string) => {
  const prompt = `
Rewrite the following content while maintaining its original intent, key information, and appropriate tone:

ORIGINAL CONTENT:
Type: ${_block.type}
Text: ${_block.text || _block.term || _block.definition || ''}
Context: ${context}

REQUIREMENTS:
1. Maintain the original intent and key information
2. Preserve appropriate tone and style for the document
3. Keep the same content type (${_block.type})
4. Improve clarity, flow, and professionalism
5. Do not add new information not implied by the original
6. Keep similar length (±20%)

OUTPUT (JSON only):
{
  "rewrittenText": "Improved version of the text here..."
}
  `;
  
  try {
    const result = await callAI(prompt);
    return result?.rewrittenText || null;
  } catch (e) {
    console.error("AI rewrite failed:", e);
    return null;
  }
};

// ==========================================
// 5. CONTENT FITTING ENGINE
// ==========================================

/**
 * Strict content optimizer - ensures content fits EXACTLY in target pages
 */
const optimizeContentToFit = (allBlocks: any[], contentPages: number) => {
  if (!allBlocks || allBlocks.length === 0) return { blocks: [], scale: 1, metrics: {} };
  
  const PAGE_CAPACITY = 850; // Visual units per page
  const TOTAL_CAPACITY = contentPages * PAGE_CAPACITY;
  
  let blocks = [...allBlocks];
  let currentWeight = blocks.reduce((sum, b) => sum + getBlockWeight(b), 0);
  
  console.log(`📊 Content Analysis: ${currentWeight} / ${TOTAL_CAPACITY} units (${blocks.length} blocks)`);
  
  // PHASE 1: AGGRESSIVE TRIMMING if over capacity
  if (currentWeight > TOTAL_CAPACITY * 1.1) {
    console.log("⚠️ Content exceeds capacity, trimming...");
    
    // Priority removal order
    const removalPriority = [
      'quote',
      'takeaway', 
      'stat',
      'key_term',
      'image_prompt'
    ];
    
    for (const type of removalPriority) {
      if (currentWeight <= TOTAL_CAPACITY * 1.05) break;
      
      // Remove from end to beginning (keep intro content)
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i]?.type === type) {
          currentWeight -= getBlockWeight(blocks[i]);
          blocks[i] = null;
          console.log(`  Removed ${type} block`);
          if (currentWeight <= TOTAL_CAPACITY * 1.05) break;
        }
      }
    }
    
    // Remove excess paragraphs if still over
    if (currentWeight > TOTAL_CAPACITY * 1.05) {
      const paragraphs = blocks.map((b, i) => ({ b, i }))
        .filter(x => x.b && x.b.type === 'p')
        .sort((a, b) => getBlockWeight(b.b) - getBlockWeight(a.b)); // Remove longest first
      
      for (const p of paragraphs) {
        if (currentWeight <= TOTAL_CAPACITY * 1.05) break;
        currentWeight -= getBlockWeight(p.b);
        blocks[p.i] = null;
        console.log(`  Removed paragraph`);
      }
    }
    
    blocks = blocks.filter(b => b !== null);
    currentWeight = blocks.reduce((sum, b) => sum + getBlockWeight(b), 0);
  }
  
  // PHASE 2: CALCULATE SCALING
  const utilizationRatio = currentWeight / TOTAL_CAPACITY;
  let scale = 1.0;
  
  if (utilizationRatio > 1.0) {
    // Need to shrink (reduce font size)
    scale = 0.88; // 12% reduction
  } else if (utilizationRatio < 0.7) {
    // Can enlarge (increase font size for better readability)
    scale = 1.12; // 12% increase
  }
  
  console.log(`✅ Final: ${currentWeight} units, scale: ${scale.toFixed(2)}x`);
  
  return {
    blocks,
    scale,
    metrics: {
      totalWeight: currentWeight,
      capacity: TOTAL_CAPACITY,
      utilization: (utilizationRatio * 100).toFixed(1) + '%',
      blockCount: blocks.length
    }
  };
};

/**
 * Strict pagination - distributes content across EXACT page count
 */
const paginateContent = (blocks: any[], contentPages: number, scale: number) => {
  if (!blocks || blocks.length === 0) return Array(contentPages).fill([]);
  
  const BASE_CAPACITY = 850;
  const PAGE_CAPACITY = BASE_CAPACITY / scale; // Adjust for font scaling
  
  const pages = [];
  let currentPage = [];
  let currentWeight = 0;
  
  for (const block of blocks) {
    const weight = getBlockWeight(block);
    
    // Force new page if over capacity (unless it's the last page)
    if (currentWeight + weight > PAGE_CAPACITY && pages.length < contentPages - 1) {
      pages.push(currentPage);
      currentPage = [block];
      currentWeight = weight;
    } else {
      currentPage.push(block);
      currentWeight += weight;
    }
  }
  
  // Add remaining content
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  
  // Pad with meaningful content if needed
  while (pages.length < contentPages) {
    const placeholderContent = [
      { type: 'h2', text: 'Additional Analysis' },
      { type: 'p', text: 'This section provides further analysis and insights that complement the main content presented in this document. The additional material helps to provide a more comprehensive understanding of the topic.' },
      { type: 'p', text: 'Further research and investigation could explore additional aspects of this subject matter, including case studies, comparative analyses, and practical applications.' },
      { type: 'key_term', term: 'Research Implications', definition: 'The broader impact and significance of the findings for future studies and practical applications in this field.' }
    ];
    pages.push(placeholderContent);
  }
  
  // Trim excess pages
  return pages.slice(0, contentPages);
};

// ==========================================
// 6. EDITING CONTROLS
// ==========================================

const HoverControlPanel = ({ 
  block, 
  blockIndex, 
  pageIndex, 
  onMoveUp, 
  onMoveDown, 
  onDelete, 
  onAIRewrite,
  onFormatText,
  isVisible 
}: {
  block: any;
  blockIndex: number;
  pageIndex: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAIRewrite: () => void;
  onFormatText: (format: string) => void;
  isVisible: boolean;
}) => {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  // Suppress unused parameter warnings
  void block;
  void blockIndex;
  void pageIndex;

  if (!isVisible) return null;

  const handleAIRewrite = async () => {
    setIsRewriting(true);
    await onAIRewrite();
    setIsRewriting(false);
  };

  return (
    <div className="absolute top-2 right-2 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-95 group-hover:scale-100">
      <div className="flex items-center gap-1">
        {/* Move Controls */}
        <button
          onClick={onMoveUp}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Move Up"
        >
          <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={onMoveDown}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Move Down"
        >
          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-300 mx-1" />

        {/* Text Formatting */}
        <div className="relative">
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Text Formatting"
          >
            <TypeIcon className="w-3.5 h-3.5 text-gray-600" />
          </button>
          
          {showFormatMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
              <div className="space-y-2">
                {/* Font Size */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Size:</span>
                  <select 
                    className="text-xs border rounded px-1 py-0.5"
                    onChange={(e) => onFormatText(`fontSize:${e.target.value}`)}
                  >
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                {/* Font Style */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Font:</span>
                  <select 
                    className="text-xs border rounded px-1 py-0.5"
                    onChange={(e) => onFormatText(`fontFamily:${e.target.value}`)}
                  >
                    <option value="inherit">Default</option>
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans-serif</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>

                {/* Text Alignment */}
                <div className="flex gap-1">
                  <button
                    onClick={() => onFormatText('textAlign:left')}
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                    title="Align Left"
                  >
                    <AlignLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onFormatText('textAlign:center')}
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                    title="Align Center"
                  >
                    <AlignCenter className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onFormatText('textAlign:right')}
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                    title="Align Right"
                  >
                    <AlignRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Text Style */}
                <div className="flex gap-1">
                  <button
                    onClick={() => onFormatText('fontWeight:bold')}
                    className="p-1 hover:bg-gray-100 rounded text-xs font-bold"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    onClick={() => onFormatText('fontStyle:italic')}
                    className="p-1 hover:bg-gray-100 rounded text-xs italic"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    onClick={() => onFormatText('textDecoration:underline')}
                    className="p-1 hover:bg-gray-100 rounded text-xs underline"
                    title="Underline"
                  >
                    U
                  </button>
                </div>

                {/* Color Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Color:</span>
                  <input
                    type="color"
                    className="w-6 h-6 border rounded cursor-pointer"
                    onChange={(e) => onFormatText(`color:${e.target.value}`)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Rewrite */}
        <button
          onClick={handleAIRewrite}
          disabled={isRewriting}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          title="AI Rewrite"
        >
          {isRewriting ? (
            <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-gray-600" />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-100 rounded transition-colors group/delete"
          title="Delete"
        >
          <Delete className="w-3.5 h-3.5 text-gray-600 group-hover/delete:text-red-600" />
        </button>
      </div>
    </div>
  );
};

const PageManagementPanel = ({ 
  _pageIndex, 
  totalPages, 
  onDeletePage, 
  onAddPage,
  isVisible 
}: {
  _pageIndex: number;
  totalPages: number;
  onDeletePage: () => void;
  onAddPage: (position: 'before' | 'after') => void;
  isVisible: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Suppress unused parameter warning
  void _pageIndex;

  if (!isVisible) return null;

  return (
    <div className="absolute top-2 left-2 z-40">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
        title="Page Options"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </button>

      {showMenu && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px] z-50">
          <div className="space-y-1">
            <button
              onClick={() => { onAddPage('before'); setShowMenu(false); }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <FilePlus className="w-3.5 h-3.5" />
              Add Page Before
            </button>
            <button
              onClick={() => { onAddPage('after'); setShowMenu(false); }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <FilePlus className="w-3.5 h-3.5" />
              Add Page After
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={() => { onDeletePage(); setShowMenu(false); }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 rounded flex items-center gap-2 text-red-600"
              disabled={totalPages <= 1}
            >
              <Delete className="w-3.5 h-3.5" />
              Delete Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfirmationDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7. COMPONENTS
// ==========================================

const DesignInjector = ({ template, scale }: { template: any, scale: number }) => {
  if (!template) return null;
  const c = template.colors;
  const f = template.fonts;
  
  const baseSize = 11; 
  const scaledSize = Math.max(9, Math.min(13, baseSize * scale));
  const baseSpacing = 1.5;
  const scaledSpacing = Math.max(1.1, Math.min(2.0, baseSpacing * scale));

  return (
    <style>{`
      :root {
        --tx-bg: ${c.bg};
        --tx-text: ${c.text};
        --tx-accent: ${c.accent};
        --tx-secondary: ${c.secondary};
        --tx-border: ${c.border};
        --tx-head: '${f.heading}', sans-serif;
        --tx-body: '${f.body}', sans-serif;
        --tx-radius: ${template.layout.radius};
        
        /* Elastic Layout Vars */
        --tx-size: ${scaledSize}pt;
        --tx-spacing: ${scaledSpacing}rem;
      }
      .tx-page-bg { background-color: var(--tx-bg); color: var(--tx-text); }
      .tx-heading { font-family: var(--tx-head); color: var(--tx-accent); }
      .tx-body { 
        font-family: var(--tx-body); 
        color: var(--tx-text); 
        font-size: var(--tx-size);
        line-height: 1.4;
      }
      .tx-box { 
        background: var(--tx-bg); 
        border: 1px solid var(--tx-border); 
        border-radius: var(--tx-radius);
      }
      .tx-box-filled {
        background: var(--tx-secondary);
        border: 1px solid var(--tx-border);
        border-radius: var(--tx-radius);
      }
    `}</style>
  );
};

const Editable = ({ 
  tag: Tag = 'div', 
  children, 
  className, 
  style, 
  onUpdate,
  blockIndex,
  pageIndex 
}: { 
  tag?: string; 
  children: any; 
  className?: string; 
  style?: any;
  onUpdate?: (pageIndex: number, blockIndex: number, newText: string) => void;
  blockIndex?: number;
  pageIndex?: number;
}) => {
  const [html, setHtml] = useState(() => safeStr(children));
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => { 
    if (!isEditing) {
      setHtml(safeStr(children)); 
    }
  }, [children, isEditing]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const newText = e.target.innerText;
    setHtml(newText);
    setIsEditing(false);
    
    if (onUpdate && pageIndex !== undefined && blockIndex !== undefined && newText !== safeStr(children)) {
      onUpdate(pageIndex, blockIndex, newText);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  return (
    React.createElement(Tag, {
      className: `outline-none hover:bg-black/5 transition-colors rounded ${className} ${isEditing ? 'bg-black/10' : ''}`,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: handleBlur,
      onFocus: handleFocus,
      style: style,
      dangerouslySetInnerHTML: { __html: html }
    })
  );
};

const AIImage = ({ desc }: { desc: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => trigger(), Math.random() * 500); 
    return () => clearTimeout(timer);
  }, []);
  
  const trigger = async () => {
    if (loading || src) return;
    setLoading(true);
    const img = await generateImage(desc);
    if(img) {
      setSrc(img);
      // Mark image as loaded
      if(imgRef.current) {
        imgRef.current.dataset.imageLoaded = 'true';
      }
    } else {
      // If generation fails, create a placeholder SVG
      const fallback = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
          <rect fill="#f3f4f6" width="800" height="400"/>
          <text x="400" y="180" text-anchor="middle" fill="#6b7280" font-size="16" font-family="Arial">
            Diagram: ${desc.substring(0, 40)}...
          </text>
          <text x="400" y="220" text-anchor="middle" fill="#9ca3af" font-size="12" font-family="Arial">
            (Image generation in progress)
          </text>
        </svg>
      `)}`;
      setSrc(fallback);
      if(imgRef.current) {
        imgRef.current.dataset.imageLoaded = 'true';
      }
    }
    setLoading(false);
  };

  return (
    <div className="my-4 w-full break-inside-avoid relative group">
      {src ? (
        <img 
          ref={imgRef}
          src={src} 
          crossOrigin="anonymous"
          className="w-full h-48 object-cover rounded-lg shadow-sm border border-[var(--tx-border)]"
          onLoad={(e) => {
            const target = e.target as HTMLImageElement;
            if(target) target.dataset.imageLoaded = 'true';
          }}
          onError={(e) => {
            // Even on error, mark as loaded so PDF export doesn't hang
            const target = e.target as HTMLImageElement;
            if(target) target.dataset.imageLoaded = 'true';
          }}
        />
      ) : (
        <div className="w-full h-48 flex flex-col items-center justify-center border-2 border-dashed border-[var(--tx-border)] bg-[var(--tx-secondary)] rounded-lg">
          {loading ? <Loader2 className="animate-spin text-[var(--tx-accent)] mb-2"/> : <ImageIcon className="text-[var(--tx-accent)] mb-2 opacity-50"/>}
          <span className="text-xs font-bold uppercase opacity-50">{loading ? 'Generating...' : 'Placeholder'}</span>
          <span className="text-[10px] opacity-40 mt-1 max-w-xs text-center px-4">"{safeStr(desc).substring(0, 50)}"</span>
        </div>
      )}
    </div>
  );
};

const BlockRenderer = ({ 
  block, 
  blockIndex, 
  pageIndex, 
  onMoveUp, 
  onMoveDown, 
  onDelete, 
  onAIRewrite,
  onFormatText,
  onUpdateText 
}: { 
  block: any; 
  blockIndex: number; 
  pageIndex: number; 
  onMoveUp: () => void; 
  onMoveDown: () => void; 
  onDelete: () => void; 
  onAIRewrite: () => void; 
  onFormatText: (format: string) => void; 
  onUpdateText: (pageIndex: number, blockIndex: number, newText: string) => void;
}) => {
  if (!block) return null;
  const { type, text, title, value, label, term, definition, desc } = block;
  const [isHovered, setIsHovered] = useState(false);

  const renderContent = () => {
    switch(type) {
      case 'h2': 
        return <Editable tag="h3" className="tx-heading text-2xl font-bold mt-6 mb-3 break-after-avoid border-b pb-2 border-[var(--tx-border)]" onUpdate={onUpdateText} blockIndex={blockIndex} pageIndex={pageIndex} style={block.style}>{text}</Editable>;
      case 'p': 
        return <Editable tag="p" className="tx-body mb-4 text-justify opacity-90" onUpdate={onUpdateText} blockIndex={blockIndex} pageIndex={pageIndex} style={block.style}>{text}</Editable>;
    
    case 'key_term':
      return (
        <div className="my-4 p-4 border-l-4 break-inside-avoid shadow-sm tx-box-filled" style={{borderLeftColor: 'var(--tx-accent)'}}>
          <div className="flex items-center gap-2 mb-1">
            <Book size={14} className="text-[var(--tx-accent)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--tx-accent)]">Key Concept</span>
          </div>
          <span className="tx-heading font-bold text-base block mb-1" style={{color: 'var(--tx-text)'}}>{safeStr(term || title)}</span>
          <span className="tx-body text-sm opacity-90">{safeStr(definition || text)}</span>
        </div>
      );

    case 'takeaway':
      return (
        <div className="my-4 p-4 border-2 border-dashed rounded-lg break-inside-avoid flex gap-4 items-start" style={{borderColor: 'var(--tx-accent)', backgroundColor: 'var(--tx-bg)'}}>
          <Lightbulb size={24} className="text-[var(--tx-accent)] shrink-0 mt-1"/>
          <div>
            <span className="text-xs font-bold uppercase block mb-1 text-[var(--tx-accent)]">Insight</span>
            <Editable tag="p" className="tx-body text-sm font-medium" onUpdate={onUpdateText} blockIndex={blockIndex} pageIndex={pageIndex} style={block.style}>{text}</Editable>
          </div>
        </div>
      );

    case 'stat':
      return (
        <div className="my-6 p-6 text-center tx-box-filled break-inside-avoid relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--tx-accent)]"></div>
          <span className="tx-heading text-5xl font-black block mb-2">{safeStr(value)}</span>
          <span className="tx-body text-xs uppercase tracking-widest font-bold opacity-70">{safeStr(label)}</span>
        </div>
      );

    case 'image_prompt': 
      return <AIImage desc={desc || text} />;
      
    default: return null;
  }
  };

  return (
    <div 
      className="relative group transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderContent()}
      <HoverControlPanel
        block={block}
        blockIndex={blockIndex}
        pageIndex={pageIndex}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        onAIRewrite={onAIRewrite}
        onFormatText={onFormatText}
        isVisible={isHovered}
      />
    </div>
  );
};

const Page = ({ 
  children, 
  num, 
  template, 
  meta, 
  totalPages, 
  onDeletePage, 
  onAddPage,
  blockOperations,
  onUpdateText 
}: { 
  children: any; 
  num: number; 
  template: any; 
  meta: any; 
  totalPages: number; 
  onDeletePage: () => void; 
  onAddPage: (position: 'before' | 'after') => void;
  blockOperations: {
    onMoveBlock: (pageIndex: number, blockIndex: number, direction: 'up' | 'down') => void;
    onDeleteBlock: (pageIndex: number, blockIndex: number) => void;
    onAIRewriteBlock: (pageIndex: number, blockIndex: number) => void;
    onFormatBlock: (pageIndex: number, blockIndex: number, format: string) => void;
  };
  onUpdateText: (pageIndex: number, blockIndex: number, newText: string) => void;
}) => {
  const [showPageControls, setShowPageControls] = useState(false);

  // Suppress unused parameter warnings
  void template;
  // void _pageIndex; // Not needed since it's passed to child component

  return (
    <div 
      id={`page-${num}`} 
      className="relative mx-auto bg-white shadow-2xl mb-8 overflow-hidden flex flex-col origin-top tx-page-bg group"
      style={{ width: '210mm', height: '297mm' }}
      onMouseEnter={() => setShowPageControls(true)}
      onMouseLeave={() => setShowPageControls(false)}
    >
      <PageManagementPanel
        _pageIndex={num}
        totalPages={totalPages}
        onDeletePage={onDeletePage}
        onAddPage={onAddPage}
        isVisible={showPageControls}
      />
      
      <div className="h-16 px-12 flex items-end justify-between pb-3 border-b border-[var(--tx-border)] mx-12 mt-8 shrink-0">
        <div className="flex items-center gap-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-[var(--tx-accent)]"></div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold tx-heading">{safeStr(meta?.title || 'Document').substring(0, 40)}</span>
        </div>
        <span className="text-[9px] uppercase tracking-widest opacity-40 tx-heading">Confidential</span>
      </div>

      <div className="flex-1 px-12 py-8 overflow-hidden relative flex flex-col justify-start">
        {React.Children.map(children, (child, index) => 
          React.isValidElement(child) ? 
            React.cloneElement(child as React.ReactElement<any>, {
              pageIndex: num,
              onMoveUp: () => blockOperations.onMoveBlock(num, index, 'up'),
              onMoveDown: () => blockOperations.onMoveBlock(num, index, 'down'),
              onDelete: () => blockOperations.onDeleteBlock(num, index),
              onAIRewrite: () => blockOperations.onAIRewriteBlock(num, index),
              onFormatText: (format: string) => blockOperations.onFormatBlock(num, index, format),
              onUpdateText: onUpdateText
            }) : 
            child
        )}
      </div>

      <div className="h-12 mx-12 border-t border-[var(--tx-border)] flex items-start justify-between pt-3 mb-8 shrink-0">
        <span className="text-[10px] opacity-40 font-medium tracking-wide tx-body">{new Date().getFullYear()} &bull; All Rights Reserved</span>
        <span className="text-sm font-bold opacity-60 tx-heading">{num}</span>
      </div>
    </div>
  );
};

const CoverPage = ({ meta }: { template: any, meta: any }) => (
  <div id="page-0" className="relative mx-auto shadow-2xl mb-8 overflow-hidden flex flex-col origin-top tx-page-bg"
       style={{ width: '210mm', height: '297mm' }}>
    <div className="h-full flex flex-col justify-center p-20">
       <div className="w-20 h-2 bg-[var(--tx-accent)] mb-8"></div>
       <span className="text-sm font-bold uppercase tracking-widest mb-4 opacity-60 tx-heading">{safeStr(meta?.type || 'Report')}</span>
       <h1 className="text-7xl font-black mb-6 leading-tight tx-heading">{safeStr(meta?.title || 'Untitled')}</h1>
       <p className="text-2xl opacity-70 font-light mb-12 tx-body max-w-xl">{safeStr(meta?.subtitle || '')}</p>
       
       <div className="mt-auto pt-8 border-t border-[var(--tx-border)] flex justify-between items-end">
          <div>
             <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Prepared By</p>
             <p className="text-lg font-bold tx-heading">{safeStr(meta?.author || 'AI Author')}</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Date</p>
             <p className="text-lg font-bold tx-heading">{new Date().toLocaleDateString()}</p>
          </div>
       </div>
    </div>
  </div>
);

// ==========================================
// 7. MAIN APP
// ==========================================

export default function GoodPDF() {
  const [step, setStep] = useState('SETUP');
  const [config, setConfig] = useState({ topic: '', type: 'report', pages: 4, template: 'modern' });
  const [architecture, setArchitecture] = useState<any>(null);
  // const [fullContent, setFullContent] = useState<any[]>([]);
  const [progress, setProgress] = useState('');
  const [layoutMetrics, setLayoutMetrics] = useState({ scale: 1, metrics: { utilization: '' as string | undefined, totalWeight: 0, capacity: 0, blockCount: 0 } });
  const [pageData, setPageData] = useState<any[][]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Editing state management
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  // Block operations
  const handleMoveBlock = (pageIndex: number, blockIndex: number, direction: 'up' | 'down') => {
    const newPageData = [...pageData];
    const currentPage = [...newPageData[pageIndex]];
    
    const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < currentPage.length) {
      // Swap blocks
      [currentPage[blockIndex], currentPage[targetIndex]] = [currentPage[targetIndex], currentPage[blockIndex]];
      newPageData[pageIndex] = currentPage;
      setPageData(newPageData);
    }
  };
  
  const handleDeleteBlock = (pageIndex: number, blockIndex: number) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Section',
      message: 'Are you sure you want to delete this section? This action cannot be undone.',
      onConfirm: () => {
        const newPageData = [...pageData];
        newPageData[pageIndex] = newPageData[pageIndex].filter((_, index) => index !== blockIndex);
        setPageData(newPageData);
        setConfirmationDialog({ ...confirmationDialog, isOpen: false });
      },
      onCancel: () => setConfirmationDialog({ ...confirmationDialog, isOpen: false })
    });
  };
  
  const handleAIRewriteBlock = async (pageIndex: number, blockIndex: number) => {
    const block = pageData[pageIndex][blockIndex];
    if (!block) return;
    
    const context = `Document about ${config.topic}, section type: ${block.type}`;
    const rewrittenText = await rewriteSectionWithAI(block, context);
    
    if (rewrittenText) {
      const newPageData = [...pageData];
      const updatedBlock = { ...block };
      
      if (block.type === 'p' || block.type === 'h2') {
        updatedBlock.text = rewrittenText;
      } else if (block.type === 'key_term') {
        updatedBlock.definition = rewrittenText;
      }
      
      newPageData[pageIndex][blockIndex] = updatedBlock;
      setPageData(newPageData);
    }
  };
  
  const handleFormatBlock = (pageIndex: number, blockIndex: number, format: string) => {
    const newPageData = [...pageData];
    const block = { ...newPageData[pageIndex][blockIndex] };
    
    const [property, value] = format.split(':');
    
    switch (property) {
      case 'fontSize':
        block.style = { ...block.style, fontSize: value };
        break;
      case 'fontFamily':
        block.style = { ...block.style, fontFamily: value };
        break;
      case 'textAlign':
        block.style = { ...block.style, textAlign: value };
        break;
      case 'fontWeight':
        block.style = { ...block.style, fontWeight: value };
        break;
      case 'fontStyle':
        block.style = { ...block.style, fontStyle: value };
        break;
      case 'textDecoration':
        block.style = { ...block.style, textDecoration: value };
        break;
      case 'color':
        block.style = { ...block.style, color: value };
        break;
    }
    
    newPageData[pageIndex][blockIndex] = block;
    setPageData(newPageData);
  };
  
  // Page operations
  const handleDeletePage = (pageIndex: number) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Page',
      message: 'Are you sure you want to delete this page? All content on this page will be permanently removed.',
      onConfirm: () => {
        const newPageData = pageData.filter((_, index) => index !== pageIndex);
        setPageData(newPageData);
        setConfirmationDialog({ ...confirmationDialog, isOpen: false });
      },
      onCancel: () => setConfirmationDialog({ ...confirmationDialog, isOpen: false })
    });
  };
  
  const handleAddPage = (position: 'before' | 'after', pageIndex: number) => {
    const newPageData = [...pageData];
    const emptyPage = [{ type: 'p', text: 'New page content...' }];
    
    if (position === 'before') {
      newPageData.splice(pageIndex, 0, emptyPage);
    } else {
      newPageData.splice(pageIndex + 1, 0, emptyPage);
    }
    
    setPageData(newPageData);
  };

  const handleUpdateText = (pageIndex: number, blockIndex: number, newText: string) => {
    const newPageData = [...pageData];
    const block = { ...newPageData[pageIndex][blockIndex] };
    
    if (block.type === 'p' || block.type === 'h2' || block.type === 'takeaway') {
      block.text = newText;
    }
    
    newPageData[pageIndex][blockIndex] = block;
    setPageData(newPageData);
  };
  
  useEffect(() => {
    Object.values(PRO_TEMPLATES).forEach(t => {
      loadGoogleFont(t.fonts.heading);
      loadGoogleFont(t.fonts.body);
    });
    
    const scripts = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", 
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
    ];
    scripts.forEach(src => {
      if(!document.querySelector(`script[src="${src}"]`)) {
        const s = document.createElement('script'); 
        s.src = src; 
        s.async = true; 
        document.body.appendChild(s);
      }
    });
  }, []);

  const handleStart = async () => {
    if(!config.topic) return;
    setStep('ARCHITECTING');
    
    try {
      const budget = calculatePageBudget(config.pages);
      console.log("📐 Page Budget:", budget);

      setProgress(`Planning ${budget.sectionCount} chapters for ${config.pages} pages...`);
      const arch = await generateStructure(config.topic, config.type, config.pages, budget);
      
      if (arch && arch.sections) {
        const safeSections = arch.sections.slice(0, budget.sectionCount);
        setArchitecture({...arch, sections: safeSections, budget});
        setStep('WRITING');
      } else {
        throw new Error("Architecture generation failed");
      }
    } catch (e) {
      console.error(e);
      alert("AI Error. Please try again.");
      setStep('SETUP');
    }
  };

  useEffect(() => {
    if (step === 'WRITING' && architecture) {
      const writeAll = async () => {
        const sections = architecture.sections;
        const wordBudget = architecture.budget.wordsPerSection;
        let allBlocks = [];

        // Abstract
        if (architecture.meta?.abstract) {
          allBlocks.push({ type: 'h2', text: 'Abstract' });
          allBlocks.push({ type: 'p', text: architecture.meta.abstract });
        }

        // Generate each section
        for (let i = 0; i < sections.length; i++) {
          const pct = Math.round(((i + 1) / sections.length) * 100);
          setProgress(`Writing section ${i+1}/${sections.length} (${pct}%)...`);
          
          console.log(`Generating content for section: ${sections[i].title}`);
          const res = await generateSectionContent(sections[i], config.topic, wordBudget);
          
          if (res && res.blocks) {
            console.log(`Section ${i+1} generated ${res.blocks.length} blocks`);
            allBlocks = [...allBlocks, ...res.blocks];
          } else {
            console.warn(`Section ${i+1} failed to generate content, adding fallback`);
            // Add fallback content for failed sections
            allBlocks.push({ type: 'h2', text: sections[i].title });
            allBlocks.push({ type: 'p', text: `This section about ${sections[i].detail || sections[i].title} would contain detailed information relevant to the ${config.type} on ${config.topic}. The content would be carefully crafted to fit within the allocated word budget and provide valuable insights.` });
            allBlocks.push({ type: 'p', text: 'Further research and analysis would be conducted to provide comprehensive coverage of this topic area.' });
          }
        }

        // OPTIMIZE & PAGINATE
        setProgress('Optimizing layout...');
        const contentPages = architecture.budget.contentPages;
        
        // References
        allBlocks.push({ type: 'h2', text: 'References' });
        allBlocks.push({ type: 'p', text: 'Generated by GoodPDF AI Document System.' });

        // Check if we need more content to fill pages
        const estimatedPages = Math.ceil(allBlocks.length * 80 / 850); // Rough estimate
        console.log(`Generated ${allBlocks.length} blocks, estimated ${estimatedPages} pages, need ${contentPages} pages`);
        
        if (estimatedPages < contentPages) {
          console.log('Adding supplementary content to fill remaining pages...');
          // Add supplementary sections
          const supplementarySections = [
            { title: 'Methodology', detail: 'Research approach and methods used' },
            { title: 'Discussion', detail: 'Analysis and interpretation of findings' },
            { title: 'Conclusion', detail: 'Summary and final thoughts' },
            { title: 'Future Work', detail: 'Potential directions for further research' }
          ];
          
          for (const section of supplementarySections) {
            if (allBlocks.length < contentPages * 10) { // Rough estimate of blocks needed
              allBlocks.push({ type: 'h2', text: section.title });
              allBlocks.push({ type: 'p', text: `This ${section.title.toLowerCase()} section provides ${section.detail.toLowerCase()}. The content here would elaborate on the key aspects discussed throughout this ${config.type} document, offering deeper insights and comprehensive analysis related to ${config.topic}.` });
              allBlocks.push({ type: 'p', text: 'The material presented in this section serves to enhance understanding and provide additional context for the topics covered in the main body of the document.' });
            }
          }
        }

        // setFullContent(allBlocks);
        
        const { blocks: optimizedBlocks, scale, metrics } = optimizeContentToFit(allBlocks, contentPages);
        const pages = paginateContent(optimizedBlocks, contentPages, scale);
        
        setPageData(pages);
        setLayoutMetrics({ scale, metrics: { utilization: metrics.utilization || '', totalWeight: metrics.totalWeight || 0, capacity: metrics.capacity || 0, blockCount: metrics.blockCount || 0 } });
        setStep('FINISHED');
      };
      writeAll();
    }
  }, [step, architecture]);

  const exportPDF = async () => {
    if (!window.jspdf || !window.html2canvas) return alert("PDF tools still loading...");
    
    setIsExporting(true);
    
    try {
      console.log("🔄 Step 0: Waiting for images to load...");
      await waitForAllImages();

      console.log("🔄 Step 1: Converting images to canvas...");
      
      // CRITICAL FIX: Convert all images to canvas elements BEFORE capturing
      const pages = document.querySelectorAll('[id^="page-"]');
      const imageReplacements = [];
      
      for (const page of pages) {
        const images = page.querySelectorAll('img');
        console.log(`Found ${images.length} images in page ${page.id}`);
        
        for (const img of images) {
          try {
            // Create a canvas with the same dimensions
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d'); if (!ctx) return;
            
            // Set canvas size to match image display size
            const rect = img.getBoundingClientRect();
            canvas.width = rect.width * 2; // 2x for quality
            canvas.height = rect.height * 2;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            canvas.className = img.className;
            
            // Draw the image onto canvas
            await new Promise((resolve) => {
              const tempImg = new Image();
              tempImg.crossOrigin = 'anonymous';
              
              tempImg.onload = () => {
                ctx?.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                console.log(`✅ Converted image to canvas: ${canvas.width}x${canvas.height}`);
                resolve(void 0);
              };
              
              tempImg.onerror = () => {
                console.warn(`⚠️ Failed to load image for canvas conversion`);
                // Draw a placeholder on canvas
                if (ctx) {
                  ctx.fillStyle = '#f3f4f6';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = '#6b7280';
                }
                if (ctx) {
                  ctx.font = '16px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('Image Placeholder', canvas.width/2, canvas.height/2);
                }
                resolve(void 0);
              };
              
              tempImg.src = img.src;
              
              // Timeout fallback
              setTimeout(() => {
                if (ctx && !ctx.getImageData(0, 0, 1, 1).data.some(x => x !== 0)) {
                  console.warn(`⏱️ Image load timeout`);
                  ctx.fillStyle = '#f3f4f6';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                resolve(void 0);
              }, 3000);
            });
            
            // Store for replacement
            imageReplacements.push({ original: img, canvas });
            
          } catch (e) {
            console.error('Canvas conversion error:', e);
          }
        }
      }
      
      console.log(`✅ Converted ${imageReplacements.length} images to canvas`);
      
      // Replace images with canvases
      imageReplacements.forEach(({ original, canvas }) => {
        if (original.parentNode) {
          original.parentNode.replaceChild(canvas, original);
        }
      });
      
      console.log("⏳ Step 2: Waiting for render...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // STEP 3: Generate PDF
      console.log("📄 Step 3: Generating PDF...");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const els = document.querySelectorAll('[id^="page-"]');
      
      for (let i = 0; i < els.length; i++) {
        console.log(`📸 Capturing page ${i + 1}/${els.length}...`);
        if (i > 0) pdf.addPage();
        
        const canvas = await window.html2canvas(els[i], { 
          scale: 2,
          useCORS: false, // Don't need CORS with canvas elements
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        console.log(`✅ Page ${i + 1} added to PDF`);
      }
      
      const filename = config.topic.substring(0, 30).replace(/[^a-z0-9]/gi, '_') || 'document';
      pdf.save(`${filename}.pdf`);
      console.log("✅ PDF saved successfully!");
      
      // STEP 4: Restore original images
      console.log("🔄 Restoring original images...");
      imageReplacements.forEach(({ original, canvas }) => {
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(original, canvas);
        }
      });
      console.log("✅ Images restored");
      
    } catch (e) {
      console.error("❌ PDF export error:", e);
      alert(`PDF export failed: ${(e as Error).message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsExporting(false);
    }
  };

  const activeTemplate = PRO_TEMPLATES[config.template as keyof typeof PRO_TEMPLATES];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <DesignInjector template={activeTemplate} scale={layoutMetrics.scale} />
      
      {/* HEADER */}
      <header className="bg-white h-16 border-b flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('SETUP')}>
          <div>
            <span className="block font-bold leading-none text-base" style={{ fontFamily: 'Inter, sans-serif', fontWeight: '700', letterSpacing: '-0.02em' }}>
              <span style={{ color: '#FF3B30' }}>Good</span><span style={{ color: '#1D1D1F' }}>PDF</span>
            </span>
          </div>
        </div>
        {step === 'FINISHED' && (
          <div className="flex items-center gap-6">
             <div className="hidden md:flex gap-4 text-xs font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                <span className="flex items-center gap-1">
                  <FileText size={12}/> {pageData.length + (architecture?.budget?.tocPages || 0) + 1}/{config.pages} pages
                </span>
                <span className="flex items-center gap-1">
                  <Scale size={12}/> Scale: {Math.round(layoutMetrics.scale * 100)}%
                </span>
                {layoutMetrics.metrics?.utilization && (
                  <span className="flex items-center gap-1">
                    <Activity size={12}/> Fill: {layoutMetrics.metrics.utilization}
                  </span>
                )}
             </div>
             <button 
               onClick={exportPDF} 
               disabled={isExporting}
               className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isExporting ? (
                 <>
                   <Loader2 size={16} className="animate-spin"/> Exporting...
                 </>
               ) : (
                 <>
                   <Download size={16}/> Export PDF
                 </>
               )}
             </button>
          </div>
        )}
      </header>

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex flex-col items-center">
        
        {step === 'SETUP' && (
          <div>
            <div className="text-center mb-8">
               <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>Create <span style={{ color: '#FF3B30' }}>Good</span> PDF's</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Topic</label>
                    <textarea 
                      value={config.topic} 
                      onChange={e => setConfig({...config, topic: e.target.value})} 
                      className="w-full p-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none h-32 resize-none pr-32" 
                      placeholder="e.g. Sustainable Energy in 2030..."
                    />
                    <button 
                      onClick={handleStart} 
                      disabled={!config.topic}
                      className="absolute bottom-2 right-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Wand2 size={12}/> Generate
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Type</label>
                      <select className="w-full p-3 border rounded-xl bg-white" value={config.type} onChange={e => setConfig({...config, type: e.target.value})}>
                        {['report', 'proposal', 'white_paper', 'thesis'].map(t => <option key={t} value={t}>{t.toUpperCase().replace('_',' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Length</label>
                      <select className="w-full p-3 border rounded-xl bg-white" value={config.pages} onChange={e => setConfig({...config, pages: parseInt(e.target.value)})}>
                        {[4, 6, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n} Pages</option>)}
                      </select>
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <label className="block text-xs font-bold uppercase text-gray-400">Select Template</label>
                  <div className="grid grid-cols-1 gap-3">
                     {Object.values(PRO_TEMPLATES).map(t => (
                        <button 
                          key={t.id}
                          onClick={() => setConfig({...config, template: t.id})}
                          className={`p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${config.template === t.id ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0`} style={{backgroundColor: t.colors.secondary, color: t.colors.accent}}>
                              {t.id === 'academic' && <GradIcon size={20}/>}
                              {t.id === 'modern' && <Monitor size={20}/>}
                              {t.id === 'creative' && <Wand2 size={20}/>}
                              {t.id === 'minimalist' && <LayoutTemplate size={20}/>}
                           </div>
                           <div>
                              <span className="font-bold block text-sm">{t.name}</span>
                              <span className="text-xs text-gray-500">{t.description}</span>
                           </div>
                           {config.template === t.id && <CheckCircle size={18} className="ml-auto text-black"/>}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

                      </div>
        )}

        {(step === 'ARCHITECTING' || step === 'WRITING') && (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
              <Activity className="absolute inset-0 m-auto text-black animate-pulse" size={32}/>
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">Drafting</h2>
            <p className="text-gray-500 font-medium animate-pulse">{progress}</p>
            <div className="mt-8 flex gap-2">
               <span className={`h-2 w-2 rounded-full ${step === 'ARCHITECTING' ? 'bg-black animate-bounce' : 'bg-gray-300'}`}></span>
               <span className={`h-2 w-2 rounded-full ${step === 'WRITING' ? 'bg-black animate-bounce delay-75' : 'bg-gray-300'}`}></span>
               <span className={`h-2 w-2 rounded-full bg-gray-300`}></span>
            </div>
          </div>
        )}

        {step === 'FINISHED' && architecture && (
          <div className="flex flex-col gap-12 pb-32 w-full items-center">
            {/* COVER PAGE */}
            <CoverPage template={activeTemplate} meta={architecture.meta} />

            {/* TABLE OF CONTENTS */}
            {architecture.budget?.hasTOC && (
              <Page
                num={1}
                template={activeTemplate}
                meta={architecture.meta}
                totalPages={pageData.length + (architecture.budget?.tocPages || 0) + 1}
                onDeletePage={() => handleDeletePage(0)}
                onAddPage={(position) => handleAddPage(position, 0)}
                blockOperations={{
                  onMoveBlock: handleMoveBlock,
                  onDeleteBlock: handleDeleteBlock,
                  onAIRewriteBlock: handleAIRewriteBlock,
                  onFormatBlock: handleFormatBlock
                }}
                onUpdateText={handleUpdateText}
              >
                <div className="space-y-4">
                  <h2 className="tx-heading text-2xl font-bold mb-6">Table of Contents</h2>
                  {architecture.sections?.map((section: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="tx-body">{safeStr(section.title)}</span>
                      <span className="tx-body text-sm opacity-60">{i + 2}</span>
                    </div>
                  ))}
                </div>
              </Page>
            )}

            {/* CONTENT PAGES */}
            {pageData.map((chunk, i) => (
              <Page 
                key={i} 
                num={i + (architecture.budget?.hasTOC ? 2 : 2)} 
                template={activeTemplate} 
                meta={architecture.meta}
                totalPages={pageData.length + (architecture.budget?.tocPages || 0) + 1}
                onDeletePage={() => handleDeletePage(i)}
                onAddPage={(position) => handleAddPage(position, i)}
                blockOperations={{
                  onMoveBlock: handleMoveBlock,
                  onDeleteBlock: handleDeleteBlock,
                  onAIRewriteBlock: handleAIRewriteBlock,
                  onFormatBlock: handleFormatBlock
                }}
                onUpdateText={handleUpdateText}
              >
                {chunk.map((block, j) => (
                  <BlockRenderer 
                    key={j} 
                    block={block}
                    blockIndex={j}
                    pageIndex={i}
                    onMoveUp={() => handleMoveBlock(i, j, 'up')}
                    onMoveDown={() => handleMoveBlock(i, j, 'down')}
                    onDelete={() => handleDeleteBlock(i, j)}
                    onAIRewrite={() => handleAIRewriteBlock(i, j)}
                    onFormatText={(format) => handleFormatBlock(i, j, format)}
                    onUpdateText={handleUpdateText}
                  />
                ))}
              </Page>
            ))}

            <div className="bg-white p-6 rounded-xl shadow text-center max-w-md">
               <h4 className="font-bold mb-2">Generation Complete</h4>
               <p className="text-sm text-gray-500 mb-4">
                 Generated exactly {pageData.length + (architecture.budget?.tocPages || 0) + 1} pages 
                 (Target: {config.pages})
               </p>
               <button onClick={exportPDF} className="bg-black text-white px-6 py-2 rounded-lg font-bold text-sm w-full">Download PDF</button>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={confirmationDialog.onCancel}
      />

    </div>
  );
}

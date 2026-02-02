import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { ClassEvent } from './db';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export interface ParsedClass {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface ParseProgress {
  stage: 'loading' | 'rendering' | 'ocr' | 'parsing' | 'complete';
  progress: number;
  message: string;
}

// Day name mappings
const DAY_MAPPINGS: Record<string, number> = {
  'sunday': 0, 'sun': 0,
  'monday': 1, 'mon': 1,
  'tuesday': 2, 'tue': 2, 'tues': 2,
  'wednesday': 3, 'wed': 3,
  'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
  'friday': 5, 'fri': 5,
  'saturday': 6, 'sat': 6,
};

// Time regex patterns
const TIME_PATTERNS = [
  /(\d{1,2}):(\d{2})\s*(am|pm)?/gi,
  /(\d{1,2})\s*(am|pm)/gi,
  /(\d{1,2})h(\d{2})/gi, // 24h format like 14h30
];

// Parse time string to HH:mm format
function parseTime(timeStr: string): string | null {
  const cleaned = timeStr.toLowerCase().trim();
  
  // Match HH:MM am/pm
  const match1 = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (match1) {
    let hours = parseInt(match1[1]);
    const minutes = match1[2];
    const period = match1[3];
    
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  // Match HH am/pm
  const match2 = cleaned.match(/(\d{1,2})\s*(am|pm)/);
  if (match2) {
    let hours = parseInt(match2[1]);
    const period = match2[2];
    
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:00`;
  }
  
  // Match 24h format
  const match3 = cleaned.match(/(\d{1,2})[h:](\d{2})/);
  if (match3) {
    const hours = parseInt(match3[1]);
    const minutes = match3[2];
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return null;
}

// Extract day of week from text
function extractDayOfWeek(text: string): number | null {
  const lower = text.toLowerCase();
  
  for (const [dayName, dayNum] of Object.entries(DAY_MAPPINGS)) {
    if (lower.includes(dayName)) {
      return dayNum;
    }
  }
  
  return null;
}

// Parse extracted text to find classes
function parseClassesFromText(text: string): ParsedClass[] {
  const classes: ParsedClass[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Common patterns for timetables
  // Pattern 1: "Monday 9:00 AM - 10:30 AM Math 101 Room A"
  // Pattern 2: Table format with days as headers
  
  let currentDay: number | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a day header
    const dayFromLine = extractDayOfWeek(line);
    if (dayFromLine !== null) {
      // Check if this line is JUST a day name (header)
      const justDay = Object.keys(DAY_MAPPINGS).some(day => 
        line.toLowerCase().trim() === day
      );
      if (justDay) {
        currentDay = dayFromLine;
        continue;
      }
    }
    
    // Try to extract time range from line
    const timeMatches = line.match(/(\d{1,2}[:h]\d{2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2}[:h]\d{2})\s*(am|pm)?/i);
    
    if (timeMatches) {
      const startTime = parseTime(timeMatches[1] + (timeMatches[2] || ''));
      const endTime = parseTime(timeMatches[3] + (timeMatches[4] || ''));
      
      if (startTime && endTime) {
        // Extract the rest as title/location
        let restOfLine = line.replace(timeMatches[0], '').trim();
        
        // Try to find day in this line or use current context
        const dayInLine = extractDayOfWeek(line);
        const day = dayInLine !== null ? dayInLine : currentDay;
        
        if (day !== null) {
          // Remove day name from rest of line
          for (const dayName of Object.keys(DAY_MAPPINGS)) {
            restOfLine = restOfLine.replace(new RegExp(dayName, 'gi'), '').trim();
          }
          
          // Try to separate title from location
          const locationMatch = restOfLine.match(/(room|rm\.?|hall|building|bldg\.?)\s*[\w\d-]+/i);
          let title = restOfLine;
          let location: string | undefined;
          
          if (locationMatch) {
            location = locationMatch[0];
            title = restOfLine.replace(locationMatch[0], '').trim();
          }
          
          if (title) {
            classes.push({
              title: title || 'Unknown Class',
              dayOfWeek: day,
              startTime,
              endTime,
              location,
            });
          }
        }
      }
    }
  }
  
  return classes;
}

// Convert PDF page to image canvas
async function pdfPageToCanvas(page: pdfjsLib.PDFPageProxy, scale: number = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;
  
  return canvas;
}

// Main PDF parsing function
export async function parsePDFTimetable(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedClass[]> {
  const report = (stage: ParseProgress['stage'], progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };
  
  try {
    report('loading', 0, 'Loading PDF...');
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    report('loading', 100, `Loaded ${numPages} page(s)`);
    
    let allText = '';
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      report('rendering', ((pageNum - 1) / numPages) * 100, `Rendering page ${pageNum}/${numPages}...`);
      
      const page = await pdf.getPage(pageNum);
      
      // First try to extract text directly (for searchable PDFs)
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      if (pageText.trim().length > 50) {
        // PDF has extractable text
        allText += pageText + '\n';
      } else {
        // Need OCR for this page
        report('ocr', ((pageNum - 1) / numPages) * 100, `Running OCR on page ${pageNum}...`);
        
        const canvas = await pdfPageToCanvas(page);
        const imageData = canvas.toDataURL('image/png');
        
        const result = await Tesseract.recognize(imageData, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              report('ocr', ((pageNum - 1 + m.progress) / numPages) * 100, `OCR page ${pageNum}: ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        
        allText += result.data.text + '\n';
      }
    }
    
    report('parsing', 0, 'Parsing extracted text...');
    
    const classes = parseClassesFromText(allText);
    
    report('complete', 100, `Found ${classes.length} class(es)`);
    
    return classes;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF. Please try a different file or enter classes manually.');
  }
}

// Parse image timetable using OCR
export async function parseImageTimetable(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedClass[]> {
  const report = (stage: ParseProgress['stage'], progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };
  
  try {
    report('loading', 0, 'Loading image...');
    
    const imageUrl = URL.createObjectURL(file);
    
    report('ocr', 0, 'Running OCR...');
    
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          report('ocr', m.progress * 100, `OCR: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    URL.revokeObjectURL(imageUrl);
    
    report('parsing', 0, 'Parsing extracted text...');
    
    const classes = parseClassesFromText(result.data.text);
    
    report('complete', 100, `Found ${classes.length} class(es)`);
    
    return classes;
  } catch (error) {
    console.error('Image parsing error:', error);
    throw new Error('Failed to parse image. Please try a different file or enter classes manually.');
  }
}

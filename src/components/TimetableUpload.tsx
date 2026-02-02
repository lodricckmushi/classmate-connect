import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parsePDFTimetable, parseImageTimetable, ParsedClass, ParseProgress } from '@/lib/pdfParser';
import { addEvent, ClassEvent } from '@/lib/db';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TimetableUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onClassesAdded: () => void;
}

const COLORS = [
  'hsl(210, 80%, 50%)',
  'hsl(142, 70%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(270, 70%, 60%)',
  'hsl(16, 85%, 60%)',
  'hsl(180, 70%, 45%)',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TimetableUpload({ isOpen, onClose, onClassesAdded }: TimetableUploadProps) {
  const [stage, setStage] = useState<'upload' | 'processing' | 'review' | 'error'>('upload');
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [parsedClasses, setParsedClasses] = useState<ParsedClass[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage('processing');
    setError(null);

    try {
      let classes: ParsedClass[];

      if (file.type === 'application/pdf') {
        classes = await parsePDFTimetable(file, setProgress);
      } else if (file.type.startsWith('image/')) {
        classes = await parseImageTimetable(file, setProgress);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or image.');
      }

      if (classes.length === 0) {
        setError('No classes found in the file. Try uploading a clearer image or enter classes manually.');
        setStage('error');
        return;
      }

      setParsedClasses(classes);
      setSelectedClasses(new Set(classes.map((_, i) => i)));
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setStage('error');
    }
  };

  const handleToggleClass = (index: number) => {
    setSelectedClasses(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImportClasses = async () => {
    const classesToImport = parsedClasses.filter((_, i) => selectedClasses.has(i));
    
    for (let i = 0; i < classesToImport.length; i++) {
      const cls = classesToImport[i];
      await addEvent({
        title: cls.title,
        location: cls.location,
        dayOfWeek: cls.dayOfWeek,
        startTime: cls.startTime,
        endTime: cls.endTime,
        color: COLORS[i % COLORS.length],
        reminderMinutes: [10, 30],
        voiceReminderEnabled: true,
      });
    }

    toast.success(`Imported ${classesToImport.length} class(es)`);
    onClassesAdded();
    handleClose();
  };

  const handleClose = () => {
    setStage('upload');
    setProgress(null);
    setParsedClasses([]);
    setSelectedClasses(new Set());
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {stage === 'upload' && 'Upload Timetable'}
            {stage === 'processing' && 'Processing...'}
            {stage === 'review' && 'Review Classes'}
            {stage === 'error' && 'Upload Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {stage === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Upload your timetable</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Supports PDF and image files (JPG, PNG)
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary-gradient"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Choose File
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-4">
                  <h4 className="mb-2 text-sm font-medium">Tips for best results:</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Use a clear, high-resolution image</li>
                    <li>• Make sure text is readable</li>
                    <li>• Include day names and times</li>
                    <li>• PDF works best for digital timetables</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {stage === 'processing' && progress && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 py-8"
              >
                <div className="flex justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{progress.message}</span>
                    <span className="font-medium">{Math.round(progress.progress)}%</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  This may take a minute for large files...
                </p>
              </motion.div>
            )}

            {stage === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Found {parsedClasses.length} class(es). Select the ones to import:
                </p>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {parsedClasses.map((cls, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleToggleClass(index)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors',
                        selectedClasses.has(index)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/50 border border-transparent'
                      )}
                    >
                      <div className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                        selectedClasses.has(index)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}>
                        {selectedClasses.has(index) && <Check className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{cls.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {DAY_NAMES[cls.dayOfWeek]} • {cls.startTime} - {cls.endTime}
                          {cls.location && ` • ${cls.location}`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportClasses}
                    disabled={selectedClasses.size === 0}
                    className="flex-1 btn-primary-gradient"
                  >
                    Import {selectedClasses.size} Class(es)
                  </Button>
                </div>
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-4"
              >
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                
                <p className="text-center text-sm text-muted-foreground">
                  {error}
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setStage('upload');
                      setError(null);
                    }}
                    className="flex-1 btn-primary-gradient"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

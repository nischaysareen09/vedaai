export interface AssessmentRecord {
  id: string;
  createdAt: string; // ISO timestamp
  questionPaperName: string;
  answerSheetName: string;
  questionCount: number;
  answeredCount: number;
  totalMarks: number;
  earnedMarks: number;
  percentage: number;
}

const STORAGE_KEY = 'vedaai:assessment-history';
const MAX_RECORDS = 50;

export function getHistory(): AssessmentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistoryRecord(record: AssessmentRecord) {
  if (typeof window === 'undefined') return;
  const existing = getHistory();
  const next = [record, ...existing].slice(0, MAX_RECORDS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
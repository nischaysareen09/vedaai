export interface Question {
  id: string;
  label: string;
  text: string;
  marks: number;
}

export interface AnswerRegion {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuestionMapping {
  questionId: string;
  status: 'answered' | 'unanswered' | 'unmatched';
  regions: AnswerRegion[];
  answerText?: string;
  score?: number;
  feedback?: string;
  confidence?: number;
}

export interface ExtractionResult {
  questions: Question[];
  mappings: QuestionMapping[];
  answerImages: string[];
}
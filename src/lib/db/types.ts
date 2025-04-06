// Types for Kanji model
export interface Kanji {
  kanjiId: number;
  character: string;
  grade?: number;
  jlptLevel?: number;
  strokeCount?: number;
  meaning?: string;
  onyomi?: string;
  kunyomi?: string;
  examples?: string; // JSON array as string
  radical?: string;
  addedAt: Date;
  source: string;
}

// Types for Vocabulary model
export interface Vocabulary {
  vocabId: number;
  word: string;
  reading: string;
  meaning?: string;
  partOfSpeech?: string;
  jlptLevel?: number;
  addedAt: Date;
  source: string;
}

// Types for Word-Kanji mapping
export interface WordKanjiMapping {
  mappingId: number;
  vocabId: number;
  kanjiId: number;
  position: number;
}

// Types for Sentences
export interface Sentence {
  sentenceId: number;
  sentence: string;
  translation?: string;
  furiganaData?: string; // JSON array as string
  difficultyLevel?: number;
  tags?: string;
  source?: string;
  createdAt: Date;
  llmProcessed: boolean;
}

// Types for Word instances
export interface WordInstance {
  instanceId: number;
  sentenceId: number;
  vocabId: number;
  positionStart: number;
  positionEnd: number;
}

// Types for Progress tracking
export interface Progress {
  progressId: number;
  kanjiId?: number;
  vocabId?: number;
  sentenceId?: number;
  familiarityLevel: number;
  reviewCount: number;
  nextReviewDate?: Date;
  lastReviewedAt?: Date;
}

// Types for Study lists
export interface StudyList {
  listId: number;
  name: string;
  description?: string;
  createdAt: Date;
}

// Types for List items
export interface ListItem {
  itemId: number;
  listId: number;
  kanjiId?: number;
  vocabId?: number;
  sentenceId?: number;
  position: number;
}

// Types for Furigana cache
export interface FuriganaCache {
  cacheId: number;
  word: string;
  reading: string;
  confidence: number;
  source: string;
  createdAt: Date;
  lastUsedAt: Date;
  usageCount: number;
}

// Types for Furigana data
export interface FuriganaItem {
  text: string;
  reading?: string;
  start: number;
  end: number;
}

// Type for processing sentences
export interface SentenceWithWords {
  sentence: Sentence;
  words: (WordInstance & { vocabulary: Vocabulary })[];
} 
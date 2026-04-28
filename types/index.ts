// types/index.ts

export interface Entry {
  id: number; 
  type: string; 
  title: string; 
  content: string;
  tags: string[]; 
  refs: number[]; 
  createdAt: string; 
  updatedAt: string;
  versionNote?: string; 
  sourceId?: number | null; 
  pageRange?: string; 
  symbolKeywords?: string[];
  personalNotes?: string;
  relationData?: Record<number, string>;
  _backlinkIds?: number[];
}

export interface Source { 
  id: number; 
  title: string; 
  sourceType: string; 
  filepath: string; 
  pageRange: string; 
  bibInfo: string; 
  createdAt: string; 
  _count?: { entries: number };
}

export interface Relation { 
  id: number; 
  fromEntryId: number; 
  toEntryId: number; 
  relationType: string; 
  confidence: number; 
  createdBy: string;
}

export interface DeletedItem extends Partial<Entry>, Partial<Source> {
    deletedItemType: 'entry' | 'source';
    deletedAt: string;
}

export interface SourceOption {
  id: number;
  title: string;
  sourceType: string;
}

export interface EntryOption {
  id: number;
  title: string;
  type: string;
  tags: string[];
}


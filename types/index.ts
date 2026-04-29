// types/index.ts

export interface Entry {
  id: number; 
  type: string; 
  title: string; 
  content: string;
  latex?: string | null;
  tags: string[]; 
  refs: number[]; 
  createdAt: string; 
  updatedAt: string;
  versionNote?: string; 
  sourceId?: number | null; 
  pageRange?: string; 
  pageStart?: number | null;
  pageEnd?: number | null;
  symbolKeywords?: string[];
  personalNotes?: string;
  relationData?: Record<number, string>;
  _backlinkIds?: number[];
  
  // Relations from schema
  outgoing?: Relation[];
  incoming?: Relation[];
}

export interface Source { 
  id: number; 
  title: string; 
  sourceType: string; 
  filepath: string; 
  fileName?: string | null;
  authors?: string | null;
  year?: string | null;
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
  
  // Relations from schema
  fromEntry?: Entry;
  toEntry?: Entry;
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


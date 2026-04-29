export const TYPE_COLORS: Record<string, string> = {
  definition: '#6b8fcc',
  theorem: '#c96b6b',
  lemma: '#8fcc8f',
  corollary: '#cc6ba8',
  example: '#cc9f6b',
  remark: '#a06bcc',
  source: 'var(--source)'
}

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  pdf: '#dc2626',
  book: '#7c3aed',
  lecture: '#f59e0b',
  paper: '#2563eb',
  manual: '#6b7280',
  markdown: '#059669',
  other: '#6b7280',
  source: 'var(--source)'
}

export const ENTRY_TYPES = ['definition', 'theorem', 'lemma', 'corollary', 'example', 'remark']

export const RELATION_LABELS: Record<string, string> = {
  uses: 'Uses',
  example_of: 'Examples',
  generalizes: 'Generalizes',
  proof_depends_on: 'Proof Depends On',
  related_to: 'Related',
  contrasts_with: 'Contrasts'
}

export const INVERSE_RELATION_LABELS: Record<string, string> = {
  uses: 'Used By',
  example_of: 'Instances / Examples',
  generalizes: 'Generalized By',
  proof_depends_on: 'Proof Base for',
  related_to: 'Related (Incoming)',
  contrasts_with: 'Contrasted By'
}

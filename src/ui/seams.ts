import type { SeamKind } from '../lib/pasukHeaderModel'

export type SeamMarkerProps = {
  glyph: string
  className: string
  ariaLabel: string
}

const BASE_CLASS = 'pasuk-seam-marker'

const SEAM_MARKER_BY_KIND: Record<SeamKind, SeamMarkerProps> = {
  hard: {
    glyph: '|',
    className: `${BASE_CLASS} ${BASE_CLASS}--hard`,
    ariaLabel: 'Boundary after word: hard',
  },
  glue: {
    glyph: '•',
    className: `${BASE_CLASS} ${BASE_CLASS}--glue`,
    ariaLabel: 'Boundary after word: glue',
  },
  glue_maqqef: {
    glyph: '••',
    className: `${BASE_CLASS} ${BASE_CLASS}--glue-maqqef`,
    ariaLabel: 'Boundary after word: glue maqqef',
  },
  cut_1: {
    glyph: '›',
    className: `${BASE_CLASS} ${BASE_CLASS}--cut-1`,
    ariaLabel: 'Boundary after word: cut (rank 1)',
  },
  cut_2: {
    glyph: '»',
    className: `${BASE_CLASS} ${BASE_CLASS}--cut-2`,
    ariaLabel: 'Boundary after word: cut (rank 2)',
  },
  cut_3: {
    glyph: '❯❯',
    className: `${BASE_CLASS} ${BASE_CLASS}--cut-3`,
    ariaLabel: 'Boundary after word: cut (rank 3)',
  },
  unknown: {
    glyph: '·',
    className: `${BASE_CLASS} ${BASE_CLASS}--unknown`,
    ariaLabel: 'Boundary after word: unknown',
  },
}

export function getSeamMarkerProps(kind: SeamKind): SeamMarkerProps {
  return SEAM_MARKER_BY_KIND[kind] ?? SEAM_MARKER_BY_KIND.unknown
}


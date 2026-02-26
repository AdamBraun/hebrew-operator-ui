import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PasukHeader from '../components/PasukHeader/PasukHeader'
import type { PasukHeaderModel, SeamKind } from '../lib/pasukHeaderModel'
import AppShell from '../layout/AppShell'

function buildModel(
  words: string[],
  seams: SeamKind[],
  ref: PasukHeaderModel['ref']
): PasukHeaderModel {
  return {
    ref,
    words: words.map((text, index) => ({
      text,
      index: index + 1,
      seamAfter: seams[index] ?? 'unknown',
    })),
  }
}

function withSelection(model: PasukHeaderModel, selectedWordIndex: number): PasukHeaderModel {
  return {
    ...model,
    selection: { wordIndex: selectedWordIndex },
  }
}

function DevPasukHeaderPage() {
  const [mode, setMode] = useState<'read' | 'inspect'>('read')
  const [shortSelected, setShortSelected] = useState(3)
  const [longSelected, setLongSelected] = useState(16)
  const [mixedSelected, setMixedSelected] = useState(5)

  const shortModel = useMemo(
    () =>
      buildModel(
        ['שְׁמַ֖ע', 'יִשְׂרָאֵ֑ל', 'יְהֹוָ֥ה', 'אֱלֹהֵ֖ינוּ', 'יְהֹוָ֥ה', 'אֶחָד׃'],
        ['cut_1', 'cut_2', 'glue', 'cut_1', 'glue', 'cut_3'],
        { book: 'deuteronomy', chapter3: '006', verse3: '004' }
      ),
    []
  )

  const longModel = useMemo(() => {
    const words = [
      'וַיְהִי',
      'כִּי',
      'דִבֶּר',
      'מֹשֶׁה',
      'אֶל',
      'כָּל',
      'יִשְׂרָאֵל',
      'בְּעֵבֶר',
      'הַיַּרְדֵּן',
      'בַּמִּדְבָּר',
      'בָּעֲרָבָה',
      'מוּל',
      'סוּף',
      'בֵּין',
      'פָּארָן',
      'וּבֵין',
      'תֹּפֶל',
      'וְלָבָן',
      'וַחֲצֵרֹת',
      'וְדִי',
      'זָהָב׃',
    ]
    const seams: SeamKind[] = [
      'glue',
      'cut_1',
      'glue',
      'cut_2',
      'glue_maqqef',
      'glue',
      'cut_1',
      'glue',
      'cut_2',
      'glue',
      'cut_1',
      'glue_maqqef',
      'cut_2',
      'glue',
      'cut_3',
      'glue',
      'cut_1',
      'glue',
      'cut_2',
      'glue',
      'cut_3',
    ]
    return buildModel(words, seams, { book: 'deuteronomy', chapter3: '001', verse3: '001' })
  }, [])

  const mixedSeamModel = useMemo(
    () =>
      buildModel(
        ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'],
        ['hard', 'glue', 'glue_maqqef', 'cut_1', 'cut_2', 'cut_3', 'unknown'],
        { book: 'demo', chapter3: '000', verse3: '001' }
      ),
    []
  )

  return (
    <AppShell>
      <h1>PasukHeader Demo</h1>
      <p>
        Visual + interaction smoke page for RTL chips, seam markers, and horizontal scrolling.
        <br />
        <Link to="/">Back to Home</Link>
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" onClick={() => setMode('read')} aria-pressed={mode === 'read'}>
          Read
        </button>
        <button
          type="button"
          onClick={() => setMode('inspect')}
          aria-pressed={mode === 'inspect'}
        >
          Inspect
        </button>
      </div>

      <section style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.4rem' }}>Short verse</h2>
          <PasukHeader
            model={withSelection(shortModel, shortSelected)}
            mode={mode}
            onWordSelect={setShortSelected}
          />
        </div>

        <div>
          <h2 style={{ marginBottom: '0.4rem' }}>Long verse (horizontal scroll)</h2>
          <PasukHeader
            model={withSelection(longModel, longSelected)}
            mode={mode}
            onWordSelect={setLongSelected}
          />
        </div>

        <div>
          <h2 style={{ marginBottom: '0.4rem' }}>All seam kinds</h2>
          <PasukHeader
            model={withSelection(mixedSeamModel, mixedSelected)}
            mode={mode}
            onWordSelect={setMixedSelected}
          />
        </div>
      </section>
    </AppShell>
  )
}

export default DevPasukHeaderPage


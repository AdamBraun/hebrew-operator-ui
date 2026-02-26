import AppShell from '../layout/AppShell'
import { Link } from 'react-router-dom'
import CorpusSmokeTest from '../dev/CorpusSmokeTest'

function HomePage() {
  return (
    <AppShell>
      <h1>Hebrew Operator VM - Pasuk Trace Corpus</h1>
      <p>
        This interface will present verse text, a readable execution trace, and
        a rendered graph for each selected passage.
      </p>
      <ul>
        <li>
          <Link to="/dev/graph">GraphViewer Dev Smoke</Link>
        </li>
        <li>
          <Link to="/genesis/001/001">Genesis 001:001</Link>
        </li>
        <li>
          <Link to="/genesis/022/002">Genesis 022:002</Link>
        </li>
        <li>
          <Link to="/exodus/003/014">Exodus 003:014</Link>
        </li>
        <li>
          <Link to="/deuteronomy/006/004">Deuteronomy 006:004</Link>
        </li>
        <li>
          <Link to="/psalms/023/001">Psalms 023:001</Link>
        </li>
      </ul>
      {import.meta.env.DEV && <CorpusSmokeTest />}
    </AppShell>
  )
}

export default HomePage

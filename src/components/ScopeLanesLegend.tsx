type ScopeLanesLegendProps = {
  id?: string
}

function ScopeLanesLegend({ id }: ScopeLanesLegendProps) {
  return (
    <div id={id} className="scope-lanes-header__legend" role="note">
      <span>rank 3 = coarse</span>
      <span>rank 2 = medium</span>
      <span>rank 1 = fine</span>
    </div>
  )
}

export default ScopeLanesLegend

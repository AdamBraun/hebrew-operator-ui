import './VerseText.css'

type VerseTextProps = {
  text: string
}

function VerseText({ text }: VerseTextProps) {
  return (
    <p dir="rtl" lang="he" className="verse-text">
      {text}
    </p>
  )
}

export default VerseText

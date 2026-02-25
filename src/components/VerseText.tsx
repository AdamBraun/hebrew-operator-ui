type VerseTextProps = {
  text: string
}

function VerseText({ text }: VerseTextProps) {
  return (
    <p
      dir="rtl"
      style={{
        fontSize: '1.85rem',
        lineHeight: 1.7,
        margin: '0 0 1rem',
      }}
    >
      {text}
    </p>
  )
}

export default VerseText


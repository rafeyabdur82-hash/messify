// Material Symbols icon (font loaded in index.html). `name` is the glyph name, e.g. "lock".
export default function Icon({ name, fill = false, className = '', ...rest }) {
  return (
    <span className={`material-symbols-outlined select-none ${fill ? 'icon-fill' : ''} ${className}`} aria-hidden="true" {...rest}>
      {name}
    </span>
  )
}

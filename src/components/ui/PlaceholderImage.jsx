export default function PlaceholderImage({ alt, className = '', aspectClass = 'aspect-[4/3]' }) {
  return (
    <div
      className={`${aspectClass} ${className} bg-gray-200 flex items-center justify-center rounded-card overflow-hidden`}
      role="img"
      aria-label={alt}
    >
      <span className="text-xs text-gray-400 font-medium text-center px-4">
        {alt}
      </span>
    </div>
  )
}

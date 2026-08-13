import { Star } from 'lucide-react'

export default function StarRow({ count = 5, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <div className="flex flex-row items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          className={`${sizeClass} fill-star-gold text-star-gold`}
        />
      ))}
    </div>
  )
}

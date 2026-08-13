export default function SectionContainer({ children, className = '' }) {
  return (
    <div className={`max-w-page mx-auto w-full px-5 md:px-10 ${className}`}>
      {children}
    </div>
  )
}

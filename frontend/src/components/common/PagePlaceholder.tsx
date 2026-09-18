interface PagePlaceholderProps {
  title: string
  description: string
}

export default function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="page-placeholder">
      <p className="eyebrow">Admin module</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}

function Feature({ name, paths }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 min-w-8 text-right">{paths}</div>
      <div>{name}</div>
    </div>
  )
}

export default Feature

function Card({ name, imageUri, imageOnly = false, small = false }) {
  return (
    <div className={`w-80 flex flex-col h-full ${small ? 'w-52' : ''}`}>
      <img src={imageUri} alt={name} className="grow" />
      {!imageOnly && <div className="text-center text-xl">{name}</div>}
    </div>
  )
}

export default Card

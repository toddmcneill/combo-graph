function Card({ name, imageUri, imageOnly = false, small = false }) {
  return (
    <div className={`flex flex-col h-full ${small ? 'w-52' : 'w-72'}`}>
      <img src={imageUri} alt={name} className="grow" />
      {!imageOnly && <div className="text-center text-xl">{name}</div>}
    </div>
  )
}

export default Card

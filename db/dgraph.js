const dgraph = require("dgraph-js")
const grpc = require("@grpc/grpc-js")

const clientStub = new dgraph.DgraphClientStub(
  "localhost:9080",
  grpc.credentials.createInsecure(),
)
const dgraphClient = new dgraph.DgraphClient(clientStub)
// dgraphClient.setDebugMode(true)

async function dropAll() {
  const op = new dgraph.Operation()
  op.setDropAll(true)
  return dgraphClient.alter(op)
}

async function setSchema(schema) {
  const op = new dgraph.Operation()
  op.setSchema(schema)
  op.setRunInBackground(true)
  return dgraphClient.alter(op)
}

async function upsertObjects(objs) {
  const batchSize= 100
  for (let s = 0; s * batchSize < objs.length; s++) {
    const slice = objs.slice(s * batchSize, (s * batchSize) + batchSize)
    const queries = []
    const nquads = []
    for (let i = 0; i < slice.length; i++) {
      const { id, type, types, ...objRest } = slice[i]
      queries.push(`node${i} as var(func: eq(xid, "${sanitizeValue(id)}"))`)
      if (type) {
        nquads.push(`uid(node${i}) <dgraph.type> "${sanitizeValue(type)}" .`)
      }
      if (types) {
        nquads.push(...types.map(type => `uid(node${i}) <dgraph.type> "${sanitizeValue(type)}" .`))
      }
      nquads.push(`uid(node${i}) <xid> "${sanitizeValue(id)}" .`)
      nquads.push(...Object.keys(objRest).map(key => `uid(node${i}) <${key}> "${sanitizeValue(objRest[key])}" .`))
    }
    const query = `{ ${queries.join('\n')} }`
    const mu = new dgraph.Mutation()
    mu.setSetNquads(nquads.join('\n'))

    const req = new dgraph.Request()
    req.setQuery(query)
    req.setMutationsList([mu])
    req.setCommitNow(true)

    await dgraphClient.newTxn().doRequest(req)
  }
}

async function createEdges(edges) {
  const batchSize = 100
  for (let s = 0; s * batchSize < edges.length; s++) {
    const slice = edges.slice(s * batchSize, (s * batchSize) + batchSize)

    const queries = []
    const mutations = []
    for (let i = 0; i < slice.length; i++) {
      const [sourceId, edge, targetId] = slice[i]
      const key = `${s}_${i}`

      queries.push(`source${key} as var(func: eq(xid, "${sanitizeValue(sourceId)}"))`)
      queries.push(`target${key} as var(func: eq(xid, "${sanitizeValue(targetId)}"))`)

      const mu = new dgraph.Mutation()
      mu.setSetNquads(`uid(source${key}) <${edge}> uid(target${key}) .`)
      mu.setCond(`@if(eq(len(source${key}), 1) AND eq(len(target${key}), 1))`)
      mutations.push(mu)
    }
    const query = `{ ${queries.join('\n')} }`

    const req = new dgraph.Request()
    req.setQuery(query)
    req.setMutationsList(mutations)
    req.setCommitNow(true)

    await dgraphClient.newTxn().doRequest(req)
  }
}

async function query(queryString, variables = {}) {
  const res = await dgraphClient.newTxn().queryWithVars(queryString, variables)
  return res.getJson()
}

function close() {
  clientStub.close()
}

function sanitizeValue(value) {
  return (value + '')
    .replaceAll('"', '\\"')
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')
}

module.exports = {
  dropAll,
  setSchema,
  upsertObjects,
  createEdges,
  query,
  close,
}

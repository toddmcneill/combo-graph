const dgraph = require("dgraph-js")
const grpc = require("@grpc/grpc-js")

const clientStub = new dgraph.DgraphClientStub(
  // addr: optional, default: "localhost:9080"
  "localhost:9080",
  // credentials: optional, default: grpc.credentials.createInsecure()
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

async function write(nquads) {
  const txn = dgraphClient.newTxn()

  try {
    const mu = new dgraph.Mutation()
    mu.setSetNquads(nquads)

    const req = new dgraph.Request()
    req.setMutationsList([mu])

    await txn.commit()
  } finally {
    await txn.discard()
  }
}

async function upsert(obj) {
  const { id, type, ...objRest } = obj
  const query = `
    {
      node as var(func: eq(xid, "${sanitizeValue(id)}"))
    }
  `
  const mu = new dgraph.Mutation()
  const nquads = [
    `uid(node) <xid> "${sanitizeValue(id)}" .`,
    `uid(node) <dgraph.type> "${sanitizeValue(type)}" .`
  ]
  nquads.push(...Object.keys(objRest).map(key => `uid(node) <${key}> "${sanitizeValue(objRest[key])}".`))
  mu.setSetNquads(nquads.join('\n'))

  const req = new dgraph.Request()
  req.setQuery(query)
  req.setMutationsList([mu])
  req.setCommitNow(true)

  return dgraphClient.newTxn().doRequest(req)
}

async function bulkUpsert(objs) {
  const queries = []
  const nquads = []
  for (let i = 0; i < objs.length; i++) {
    const { id, type, ...objRest } = objs[i]
    queries.push(`node${i} as var(func: eq(xid, "${sanitizeValue(id)}"))`)
    nquads.push(`uid(node${i}) <xid> "${sanitizeValue(id)}" .`)
    nquads.push(`uid(node${i}) <dgraph.type> "${sanitizeValue(type)}" .`)
    nquads.push(...Object.keys(objRest).map(key => `uid(node${i}) <${key}> "${sanitizeValue(objRest[key])}".`))
  }
  const query = `
    {
      ${queries.join('\n')}
    }
  `
  const mu = new dgraph.Mutation()
  mu.setSetNquads(nquads.join('\n'))

  const req = new dgraph.Request()
  req.setQuery(query)
  req.setMutationsList([mu])
  req.setCommitNow(true)

  return dgraphClient.newTxn().doRequest(req)
}

async function createEdge(sourceId, targetId, edge) {
  const query = `
    {
      source as var(func: eq(xid, "${sanitizeValue(sourceId)}"))
      target as var(func: eq(xid, "${sanitizeValue(targetId)}"))
    }
  `
  const mu = new dgraph.Mutation()
  mu.setSetNquads(`uid(source) <${edge}> uid(target) .`)
  mu.setCond(`@if(eq(len(source), 1) AND eq(len(target), 1))`)

  const req = new dgraph.Request()
  req.setQuery(query)
  req.setMutationsList([mu])
  req.setCommitNow(true)

  await dgraphClient.newTxn().doRequest(req)
}

async function query(queryString, variables = {}) {
  const res = await dgraphClient.newTxn().queryWithVars(queryString, variables)
  return res.getJson()
}

function close() {
  clientStub.close()
}

function sanitizeValue(value) {
  return value.replaceAll('"', '\\"')
}

module.exports = {
  dropAll,
  setSchema,
  write,
  upsert,
  bulkUpsert,
  createEdge,
  query,
  close,
}

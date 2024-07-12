const seedData = require('./seedData')
const queries = require('./queries')

module.exports = {
  ...seedData,
  ...queries
}

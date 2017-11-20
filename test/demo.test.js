const { createTradeTable, queryAll, saveTrades2DB } = require('../lib/db')
const { expect } = require('chai')

describe('demo', () => {
  it('demo', () => {
    const demo = 'haha'
    expect(demo).to.be.equal('haha')
  })
})

describe('db lib', () => {
  it('createTradeTable', async () => {
    await createTradeTable()
  })
})

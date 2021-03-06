const moment = require('moment')
const fs = require('fs-extra')
const path = require('path')
const { getCookies, searchTrade, checkSafe } = require('./lib/lsmaps.js')
const db = require('./lib/db.js')

const cfg = fs.readJsonSync(path.join(__dirname, './config.json'))

const {
  product,
  startPage,
  countries,
  recordsPerPage,
  startDate,
  endDate,
  daysPerQuery,
  sleepTime,
} = cfg.search

async function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

;(async () => {
  await db.createTradeTable(cfg.database.tableName)
  for (let c = 0; c < countries.length; c += 1) {
    const country = countries[c]
    const daysStep = country === 'USANEW' ? daysPerQuery : daysPerQuery * 10
    let cookiesStr = await getCookies()

    let beginDate = moment(startDate, 'YYYY-MM-DD')
    let overDate = moment(beginDate).add(daysStep, 'day')
    if (overDate.format('YYYY-MM-DD') > endDate) {
      overDate = moment(endDate, 'YYYY-MM-DD')
    }

    while (overDate.format('YYYY-MM-DD') >= beginDate.format('YYYY-MM-DD')) {
      console.log('\n===================================')
      console.log(`query from ${beginDate.format('YYYY-MM-DD')} to ${overDate.format('YYYY-MM-DD')}`)
      const jsonData = await searchTrade(
        product,
        country,
        beginDate.format('YYYY-MM-DD'),
        overDate.format('YYYY-MM-DD'),
        cookiesStr,
        1,
        10,
      )

      // console.log(jsonData)

      const pageTotal = jsonData.PageTotal
      const pagePager = Math.ceil(pageTotal / recordsPerPage)
      console.log(`pagePager: ${pagePager}`)

      for (let pageIndex = startPage || 1; pageIndex <= pagePager; pageIndex += 1) {
        console.log(`${country}, ${pageIndex}/${pagePager}`)

        const isSafe = await checkSafe(cookiesStr)
        if (/false/ig.test(isSafe)) {
          console.log('relogin...')
          cookiesStr = await getCookies()
          console.log('done')
        }

        const data = await searchTrade(
          product,
          country,
          beginDate.format('YYYY-MM-DD'),
          overDate.format('YYYY-MM-DD'),
          cookiesStr,
          pageIndex,
          recordsPerPage)

        const records = data.Trade.length
        console.log(`get ${records} records by current query`)
        try {
          await db.saveTrades2DB(data.Trade)
          console.log(`${beginDate.format('YY-MM-DD')} to ${overDate.format('YY-MM-DD')}, pagePager: ${pageIndex}/${pagePager} done.`)
        } catch (err) {
          console.log(err.stack)
        }

        const waitTime = sleepTime + Math.random() * 5000
        console.log(`wait ${waitTime} ms for next query.`)
        await wait(waitTime)
      }
      if (pagePager < 1) {
        await wait(sleepTime)
      }

      beginDate = moment(overDate).add(1, 'days')
      overDate = moment(beginDate).add(daysStep, 'day')
      if (overDate.format('YYYY-MM-DD') > endDate) {
        overDate = endDate
      }
    }
  }
})()

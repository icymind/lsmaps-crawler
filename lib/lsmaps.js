const request = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs-extra')
const path = require('path')

const config = fs.readJsonSync(path.join(__dirname, '../config.json'))
const loginInfo = config.lsmaps

const urls = {
  login: 'http://pro.lsmaps.com/Common/Login?ReturnUrl=%2f',
  checkLogin: 'http://pro.lsmaps.com/Common/CheckLogin',
  home: 'http://www.lsmaps.com',
  searchAPI: 'http://pro.lsmaps.com/api/RestEs',
  token: 'http://pro.lsmaps.com/Common/Safe?token=',
}

const headers = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36',
}

function getRVT() {
  return new Promise((resolve, reject) => {
    request
      .get(urls.login)
      .set('User-Agent', headers['User-Agent'])
      .end((err, res) => {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          let RVTCookie

          const $ = cheerio.load(res.text)
          const hiddenField = $('input[name=__RequestVerificationToken]')
          const RVTField = hiddenField.val()

          const cookie = res.headers['set-cookie']
          cookie[0].split(';').forEach((segment) => {
            if (/^__RequestVerificationToken/ig.test(segment)) {
              RVTCookie = segment.split('=')[1].trim()
              resolve({ RVTField, RVTCookie })
            }
          })
        }
      })
  })
}

async function getCookies() {
  const { RVTField, RVTCookie } = await getRVT()
  let safeTokenCookie
  let lsxxCookie
  return new Promise((resolve) => {
    request
      .post(urls.checkLogin)
      .send({
        tboxAccount: loginInfo.user,
        tboxPassword: loginInfo.password,
        __RequestVerificationToken: RVTField,
      })
      .set(headers)
      .set('Cookie', `__RequestVerificationToken=${RVTCookie}`)
      .redirects(0)
      .end((_err, res) => {
        const cookies = res.headers['set-cookie']
        cookies.forEach((cookie) => {
          cookie.split(';').forEach((segment) => {
            if (/^_safe_token_=/ig.test(segment)) {
              safeTokenCookie = segment.split('=')[1].trim()
            } else if (/^lsxx=/ig.test(segment)) {
              lsxxCookie = segment.split('=')[1].trim()
            }
          })
        })
        const cookiesStr = `__RequestVerificationToken=${RVTCookie};_safe_token_=${safeTokenCookie};lsxx=${lsxxCookie}`
        resolve(cookiesStr)
      })
  })
}

async function searchTrade(product = 'bicycle', countryCode = 'USANEW', startDate = '2016-11-01', endDate = '2017-11-03', cookies, pageIndex = 1, pageSize = 10) {
  // const { RVTCookie, safeTokenCookie, lsxxCookie } = await getCookies()
  // const cookies =
  // `__RequestVerificationToken=${RVTCookie};_safe_token_=${safeTokenCookie};lsxx=${lsxxCookie}`
  // console.log(cookies)

  const formData = {
    PageIndex: pageIndex,
    PageSize: pageSize,
    SortType: 0,
    CountryCode: countryCode,
    StartDate: startDate,
    EndDate: endDate,
    Product: product,
    isNotNull: 'false',
  }

  return new Promise((resolve, reject) => {
    request
      .post(urls.searchAPI)
      .send(formData)
      .set('User-Agent', headers['User-Agent'])
      .set('Cookie', cookies)
      .retry(10)
      .end((err, res) => {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          resolve(res.body)
        }
      })
  })
}

async function checkSafe(cookies) {
  return new Promise((resolve, reject) => {
    request
      .get(urls.token + Math.random())
      .set('User-Agent', headers['User-Agent'])
      .set('Cookie', cookies)
      .end((err, res) => {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          resolve(res.text)
        }
      })
  })
}

module.exports = {
  getCookies,
  searchTrade,
  checkSafe,
}

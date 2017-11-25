const { Client } = require('pg')
const fs = require('fs-extra')
const path = require('path')

const config = fs.readJsonSync(path.join(__dirname, '../config.json'))
const cfg = config.database

async function isDatabaseExist(databaseName = 'lsmaps') {
  const defaultDB = Object.assign({}, cfg)
  defaultDB.database = 'postgres'
  const client = new Client(defaultDB)
  await client.connect()
  const records = await client.query(`SELECT datname FROM pg_database WHERE datname='${databaseName}'`)
  await client.end()
  return records.rows.length > 0 && records.rows[0].datname === databaseName
}

async function createDatabase(databaseName = 'lsmaps') {
  if (await isDatabaseExist(databaseName)) {
    console.log(`database: ${databaseName} existed`)
    return
  }
  console.log('creating database: lsmaps')
  const defaultDB = Object.assign({}, cfg)
  defaultDB.database = 'postgres'
  const client = new Client(defaultDB)
  await client.connect()
  await client.query(`create database ${databaseName}`)
  await client.end()
}

async function isTradeTableExist(tableName = 'trades') {
  const sql = `SELECT to_regclass('${tableName}')`
  const client = new Client(cfg)
  await client.connect()
  const records = await client.query(sql)
  await client.end()
  return records.rows[0].to_regclass === tableName
}

async function createTradeTable(tableName = 'trades') {
  await createDatabase(cfg.database)
  if (await isTradeTableExist(tableName || cfg.tableName)) {
    console.log(`table: ${tableName} exitsed`)
    return
  }
  console.log(`creating table: ${tableName}`)
  const sql = String.raw`
  create table ${tableName} (
    id integer not null,
    date date,
    importer TEXT,
    importer_agg TEXT,
    exporter TEXT,
    exporter_agg TEXT,
    product TEXT,
    country_code TEXT,
    country TEXT,
    country_agg TEXT,
    loading_port TEXT,
    loading_port_agg TEXT,
    unlading_port TEXT,
    unlading_port_agg TEXT,
    quantity float,
    manifest_units TEXT,
    weight float,
    weight_unit TEXT,
    value bigint,
    value_des TEXT,
    bill_of_lading_nbr TEXT,
    master_bill_of_lading TEXT,
    hs_code TEXT,
    key TEXT,
    bill_status TEXT,
    info_key TEXT,
    country_std TEXT default NULL,
    manufactur_company TEXT default NULL,
    brand TEXT default NULL,
    bill_no TEXT default NULL,
    data_country TEXT default NULL,
    quantity_unit TEXT default NULL,
    primary key (id)
  );
  `
  const client = new Client(cfg)
  await client.connect()
  await client.query(sql)
  await client.end()
}

async function queryAll(tableName = 'trades') {
  const client = new Client(cfg)
  await client.connect()
  const res = await client.query(`select * from ${tableName};`)
  res.rows.forEach(console.log)
  await client.end()
}

function getSql(tableName = 'trades', trade) {
  return {
    text: `insert into ${tableName} values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)`,
    values: [
      trade.Id,
      trade.Date,
      trade.Importer,
      trade.ImporterAgg,
      trade.Exporter,
      trade.ExporterAgg,
      trade.Product,
      trade.CountryCode,
      trade.Country,
      trade.CountryAgg,
      trade.LoadingPort,
      trade.LoadingPortAgg,
      trade.UnladingPort,
      trade.UnladingPortAgg,
      trade.Quantity,
      trade.ManifestUnits,
      trade.Weight,
      trade.WeightUnit,
      trade.Value && parseInt(trade.Value, 10),
      trade.ValueDes,
      trade.BillOfLadingNbr,
      trade.MasterBillOfLading,
      trade.HsCode,
      trade.Key,
      trade.BillStatus,
      trade.InfoKey,
      trade.CountryStd,
      trade.ManufacturCompany,
      trade.Brand,
      trade.BillNo,
      trade.DataCountry,
      trade.QuantityUnit,
    ],
  }
}

async function saveTrades2DB(tradesArray) {
  const client = new Client(cfg)
  await client.connect()
  try {
    await client.query('begin')

    for (let i = 0; i < tradesArray.length; i += 1) {
      await client.query(getSql(cfg.tableName, tradesArray[i]))
    }
    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    await client.end()
  }
}

createTradeTable(cfg.tableName)
module.exports = {
  queryAll,
  saveTrades2DB,
}

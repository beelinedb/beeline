const { isNil, defaultTo, keys, values } = require("lodash");
const fs = require("fs");
const url = require("url");
const {
  defaultParameters,
  getDatabaseCredentials,
  getDatabaseConnectionInfo,
  connectToDB,
  getHistoryTableAndSchema,
  databaseConnectionBuilderOptions,
} = require("../lib");
const { AsciiTable3, AlignmentEnum } = require("ascii-table3");
const formatISO = require("date-fns/formatISO");

exports.command = "info";
exports.desc =
  "Display migration history current stored in the migration table";
exports.builder = { ...databaseConnectionBuilderOptions };
exports.handler = async (argv) => {
  const client = await connectToDB(argv);
  const { schema, table } = getHistoryTableAndSchema(argv);
  const res = await client.query(`SELECT * FROM ${schema}.${table}`);
  await client.end();

  if (res.rows.length === 0) {
    console.log("No migrations found");
    return;
  }

  const rows = res.rows.map((r) => {
    return {
      ...r,
      installed_at: formatISO(r.installed_at),
    };
  });

  const heading = keys(rows[0]);

  // create table
  const tbl = new AsciiTable3()
    .setHeading(...heading)
    .setAlign(3, AlignmentEnum.CENTER)
    .addRowMatrix(
      rows.map((r) => {
        return values(r);
      })
    );

  tbl.setStyle("compact");
  console.log(tbl.toString());

  return res;
};

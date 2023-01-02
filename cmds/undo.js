const fs = require("fs");
const { isNil, isEmpty } = require("lodash");
const {
  connectToDB,
  getHistoryTableAndSchema,
  getMigrationDirectory,
  databaseConnectionBuilderOptions,
} = require("../lib");

async function getPathToNextUndoableMigration(client, argv) {
  const { table, schema } = getHistoryTableAndSchema(argv);

  const res = await client.query(
    `SELECT * from ${schema}.${table} WHERE undoable=true ORDER BY sequence desc LIMIT 1`
  );

  const row = res.rows[0];
  if (isNil(row)) {
    return null;
  }

  const f = row.script.replace(/^V/, "U");

  const migrationDirectory = getMigrationDirectory(argv);
  const path = isEmpty(migrationDirectory)
    ? `./${f}`
    : `${migrationDirectory}/${f}`;

  return { path, sequence: row.sequence };
}

exports.command = "undo";
exports.desc = "undo most recent migration";
exports.builder = {
  ...databaseConnectionBuilderOptions,
  "dry-run": {
    desc: "Dry run option allows you to test the migration without committing changes",
    type: "boolean",
    default: false,
  },
};
exports.handler = async (argv) => {
  //(1) Connect to the database
  const client = await connectToDB(argv);

  //(2) Find a path to the sql file for the next undo migration.
  const { path: undoPath, sequence: rowId } =
    await getPathToNextUndoableMigration(client, argv);

  if (isNil(undoPath)) {
    console.log("No migrations to undo");
    client.end();
    return;
  }

  //(3) Load and run the undo query in a transaction.
  await client.query("BEGIN;");
  const data = fs.readFileSync(undoPath).toString();
  await client.query(data);

  const { table, schema } = getHistoryTableAndSchema(argv);
  await client.query(`DELETE from ${schema}.${table} where sequence=$1`, [
    rowId,
  ]);

  //(7) Commit and return or rollback in case of dryrun
  if (argv.dryRun) {
    console.log("Undo dry run successful");
    await client.query("ROLLBACK;");
  } else {
    console.log("Undo successful");
    await client.query("COMMIT;");
  }

  client.end();
};

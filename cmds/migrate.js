const { Client } = require("pg");
const { isNil, isEmpty, defaultTo, capitalize } = require("lodash");
const fs = require("fs");
const url = require("url");
const {
  defaultParameters,
  connectToDB,
  getDatabaseCredentials,
  getHistoryTableAndSchema,
  getMigrationDirectory,
  getChecksum,
  getMigrationFileRegex,
} = require("../lib");
const semver = require("semver");

/**
 Helper function that finds the sql files whose version numbers are greater than the
 specified version number.  These are the sql files that the migrate command will run
 to complete the migration.
 */
function findFilePathsForMigration(version, argv) {
  const migrationDirectory = getMigrationDirectory(argv);

  //Read all the files in the migration directory.
  const files = fs.readdirSync(migrationDirectory);

  //Find the current max version from the sql filenames.
  const { re } = getMigrationFileRegex();
  const filesToMigrate = files.reduce((p, f) => {
    if (re.test(f)) {
      const ver = re.exec(f)[1];
      const smvr = semver.coerce(ver);

      if (semver.gt(smvr, version)) {
        const path = isEmpty(migrationDirectory)
          ? `./${f}`
          : `./${migrationDirectory}/${f}`;
        p.push(path);
      }
    }
    return p;
  }, []);
  return filesToMigrate;
}

/**
 Helper function that creates the history table in the database if it 
 doesn't already exist.  Requires a client object and the command line arguments 
 to determine which schema and table name to use.
 */
async function createHistoryTableIfNeeded(client, argv) {
  const { table, schema } = getHistoryTableAndSchema(argv);

  const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${schema}.${table} (
    sequence serial,
    version varchar PRIMARY KEY,
    description varchar not null,
    undoable boolean DEFAULT true,
    script varchar,
    hash varchar,
    installed_by varchar,
    installed_at timestamp DEFAULT current_timestamp
  )`;
  const res = await client.query(CREATE_TABLE_SQL);
}

/**
 Helper function to read the latest version from the schema history table.
 */
async function fetchCurrentVersion(client, argv) {
  const { table, schema } = getHistoryTableAndSchema(argv);

  const SELECT_HISTORY_SQL = `SELECT * from ${schema}.${table}`;

  const res = await client.query(SELECT_HISTORY_SQL);

  if (res.rows.length === 0) {
    return semver.coerce("0");
  } else {
    var max = semver.coerce("0");
    for (var i = 0; i < res.rows.length; i++) {
      var row = res.rows[i];
      const smvr = semver.coerce(row.version);
      if (isNil(semver.valid(smvr))) {
        throw new Error(
          `Found invalid version in schema history ${row.version}`
        );
      }

      if (semver.gt(smvr, max)) {
        max = smvr;
      }
    }
    return max;
  }
}

async function insertSchemaHistory(client, argv, path, data) {
  const { table, schema } = getHistoryTableAndSchema(argv);
  const components = path.split("/");
  const file = components[components.length - 1];
  const { re } = getMigrationFileRegex();
  const ver = semver.valid(semver.coerce(re.exec(file)[1]));
  const desc = capitalize(re.exec(file)[2].replace("_", " "));
  const { user } = getDatabaseCredentials(argv);
  const checksum = getChecksum(data);

  const INSERT_HISTORY_SQL = `INSERT INTO ${schema}.${table} (version, description, script, installed_by, hash) VALUES ($1, $2, $3, $4, $5)`;

  var res = await client.query(INSERT_HISTORY_SQL, [
    ver,
    desc,
    file,
    user,
    checksum,
  ]);
  return res;
}

exports.command = "migrate";
exports.desc = "run most recent migration scripts";
exports.builder = {
  "dry-run": {
    desc: "Dry run option allows you to test the migration without committing changes",
    type: "boolean",
    default: false,
  },
};
exports.handler = async (argv) => {
  //(1) Connect to the database
  const client = await connectToDB(argv);
  //(2) Check if the migration history table exists and create it if not
  await createHistoryTableIfNeeded(client, argv);
  //(3) Fetch the current version from the migration history table
  const currentVersion = await fetchCurrentVersion(client, argv);
  //(4) Find the migration files whose versions are greater than the current version
  const paths = findFilePathsForMigration(currentVersion, argv);
  if (paths.length === 0) {
    console.log("No files to migrate");
    await client.end();
    return;
  }

  //(5) Run the sql in each migration file inside a transaction
  await client.query("BEGIN;");

  for (var i = 0; i < paths.length; i++) {
    const path = paths[i];
    const data = fs.readFileSync(path).toString();
    const res = await client.query(data);

    //(6) Before committing the transaction insert record into the history table.
    await insertSchemaHistory(client, argv, path, data);
  }

  //(7) Commit and return or rollback in case of dryrun
  if (argv.dryRun) {
    console.log("Migration dry run successful");
    await client.query("ROLLBACK;");
  } else {
    console.log("Migration successful");
    await client.query("COMMIT;");
  }

  await client.end();
};

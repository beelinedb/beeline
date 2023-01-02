const crypto = require("crypto");
const fs = require("fs");
const url = require("url");
const { Client } = require("pg");
const { isNil, defaultTo } = require("lodash");

const defaultParameters = {
  table: "beeline_schema_history",
  schema: "public",
  migrationDirectory: "./sql",
};

const databaseConnectionBuilderOptions = {
  url: {
    describe: "url to use to connect to database",
  },
  user: {
    describe: "user used to connect to database",
  },
  password: {
    describe: "password used to connect to database",
  },

  table: {
    description: "schema history table",
    type: "string",
  },
  config: {
    description: "Specify optional config file",
    type: "string",
    coerce: (val) => {
      if (!isNil(val)) {
        try {
          const file = fs.readFileSync(val, "utf8");
          return yaml.parse(file);
        } catch (error) {
          const err = new Error(`Unable to load config file`);
          err.code = error.code;
          throw error;
        }
      } else {
        return null;
      }
    },
  },
};

/**
 Helper that return a regular expression that can use used to match 
 migration file names.
 */
function getMigrationFileRegex() {
  const re = /^V(\d+(?:\.\d+(?:\.\d+)?)?)__(.+)\.sql/;
  const undo = /^U(\d+(?:\.\d+(?:\.\d+)?)?)__(.+)\.sql/;

  return {
    re,
    undo,
  };
}

/**
  Helper function that returns a MD5 hash on the specified data.
 */
function getChecksum(data) {
  const hash = crypto.createHash("md5");
  hash.update(data);
  return hash.digest("hex");
}

// Usage
// node ./file.js path/to/file
//getChecksum(process.argv[2]).then(console.log).catch(console.error);

function getMigrationDirectory(argv, create = false) {
  const migrationDirectory =
    argv.migrationDirectory ||
    argv.config?.migrationDirectory ||
    defaultParameters.migrationDirectory;

  if (create === true) {
    if (!fs.existsSync(migrationDirectory)) {
      fs.mkdirSync(migrationDirectory);
    }
  }

  return migrationDirectory;
}

function getHistoryTableAndSchema(argv) {
  const table = argv.table || argv.config?.table || defaultParameters.table;
  const schema = argv.schema || argv.config?.schema || defaultParameters.schema;
  return {
    table,
    schema,
  };
}

function getDatabaseConnectionInfo(argv) {
  const dburl = defaultTo(argv.config?.url, argv.url);
  if (isNil(dburl)) {
    throw new Error("url to database is required.");
  }
  const { hostname: host, port, path } = url.parse(`tcp://${dburl}`);

  if (isNil(host)) {
    throw new Error("database hostname is required");
  }

  if (isNil(port)) {
    throw new Error("database port is required");
  }

  if (isNil(path)) {
    throw new Error("a name for database to connect to is required");
  }
  return { host, port, database: path.substring(1) };
}

function getDatabaseCredentials(argv) {
  if (
    !isNil(argv.config) &&
    !isNil(argv.config.user) &&
    !isNil(argv.config.password)
  ) {
    return {
      user: argv.config.user,
      password: argv.config.password,
    };
  } else if (!isNil(argv.user) && !isNil(argv.password)) {
    return { user: argv.user, password: argv.password };
  } else {
    throw new Error("database user and password not found.");
  }
}

async function connectToDB(argv) {
  const { user, password } = getDatabaseCredentials(argv);

  const { host, port, database } = getDatabaseConnectionInfo(argv);

  const client = new Client({
    user,
    host,
    database,
    password,
    port,
  });
  await client.connect();

  return client;
}

exports.defaultParameters = defaultParameters;
exports.getDatabaseCredentials = getDatabaseCredentials;
exports.getDatabaseConnectionInfo = getDatabaseConnectionInfo;
exports.connectToDB = connectToDB;
exports.getHistoryTableAndSchema = getHistoryTableAndSchema;
exports.getMigrationDirectory = getMigrationDirectory;
exports.getChecksum = getChecksum;
exports.getMigrationFileRegex = getMigrationFileRegex;
exports.databaseConnectionBuilderOptions = databaseConnectionBuilderOptions;

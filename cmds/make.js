const fs = require("fs");
const { defaultTo } = require("lodash");
const {
  defaultParameters,
  getMigrationDirectory,
  getMigrationFileRegex,
} = require("../lib");
const semver = require("semver");

exports.command = "make <name> [type]";
exports.desc = "Create a blank sql file for migration queries";
exports.builder = (yargs) => {
  return yargs
    .positional("name", {
      description: "Name to use for the migration",
    })
    .positional("type", {
      desc: "Type of upgrade to apply to the migration version number",
      choices: ["major", "minor", "patch"],
      default: "major",
    })
    .option("dry-run", {
      description: "Perform of a dry run of the making of new migration files",
      type: "boolean",
      default: false,
    })
    .option("migrationDirectory", {
      description: "Migration directory",
      type: "string",
      alias: "m",
      default: "sql",
    })
    .option("undo", {
      description:
        "Create an accompanying sql file for queries to undo the migration",
      type: "boolean",
      alias: "u",
      default: true,
    });
};

exports.handler = async (argv) => {
  const migrationDirectory = getMigrationDirectory(argv, true);

  //Read all the files in the migration directory.
  const files = fs.readdirSync(migrationDirectory);

  //Find the current max version from the sql filenames.
  const { re } = getMigrationFileRegex();
  const currentVersion = files.reduce((p, f) => {
    //const re = /^V(\d+(?:\.)?)__(.+)\.sql/;
    if (re.test(f)) {
      const ver = semver.coerce(re.exec(f)[1]);
      if (semver.gt(ver, p)) return ver;
    }
    return p;
  }, semver.coerce("0"));

  currentVersion.inc(argv.type);
  //Replaces whitespace with underscores
  const name = argv.name.replace(/\s/g, "_");

  //Create path to the new migration file.
  const newFiles = [
    `${migrationDirectory}/V${currentVersion.version}__${name}.sql`,
  ];

  //Create a path for the undo file if requested by the user
  if (argv.undo) {
    newFiles.push(
      `${migrationDirectory}/U${currentVersion.version}__${name}.sql`
    );
  }

  if (argv.dryRun) {
    console.log(`The following migration files will be created: ${newFiles}`);
    console.log("Dry run complete.");
    return;
  }
  //Loop through the paths and create the blank files.
  newFiles.forEach((file) => {
    fs.closeSync(fs.openSync(file, "w"));
  });

  //Print a success message to standard output
  console.log(
    `Succesfully created migration file(s): ${newFiles
      .map((f) => {
        const paths = f.split("/");
        return paths[paths.length - 1];
      })
      .join(", ")}`
  );
};

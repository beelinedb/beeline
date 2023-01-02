#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { isNil } = require("lodash");
const fs = require("fs");
const yaml = require("yaml");

yargs(process.argv.slice(2))
  .usage("$0 <command>")
  .commandDir("./cmds")
  .demandCommand()
  // .option("config", {
  //   description: "Specify optional config file",
  //   type: "string",
  //   coerce: (val) => {
  //     if (!isNil(val)) {
  //       try {
  //         const file = fs.readFileSync(val, "utf8");
  //         return yaml.parse(file);
  //       } catch (error) {
  //         const err = new Error(`Unable to load config file`);
  //         err.code = error.code;
  //         throw error;
  //       }
  //     } else {
  //       return null;
  //     }
  //   },
  // })
  // .options("table", {
  //   description: "schema history table",
  //   type: "string",
  // })
  // .fail((message, error) => {
  //   console.error(error.message, error.code);
  //   process.exit(1);
  // })
  .help().argv;

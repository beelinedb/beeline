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
  .help().argv;

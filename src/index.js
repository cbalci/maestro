#!/usr/bin/env node

'use strict';
const program = require('commander');
let _ = require('lodash');

const ver = require('./app/helpers/version');
const doc = require('./app/helpers/genericEvaTask');
const actor = require('./app/helpers/actor');
const path = require('path');

const DEFAULT_FILE = `${__dirname}/main.yml`;
program
    .version(ver.currentVersion)
    .option('-i, --input [.yml]', 'specify the yml file to use', DEFAULT_FILE)
    .parse(process.argv);

if (program.input) {
    const yml = doc.genericEvaTask(program.input);
    console.log(`converted the YAML file [${program.input}]`);

    const actors = actor.actors(yml);
    console.log(`Getting actors array...`);

    //TODO: loop thru tasks and build the output
    let evaTaskList = {
        actors: actors
    };
    _.forEach(_.get(yml, 'tasks'), (task) => {

        let taskFile = `${path.dirname(program.input)}/${_.get(task, 'file')}`;
        console.log('serializing task', `${__dirname}/${taskFile}`);
        if (!!taskFile) {
            let fileTask = doc.genericEvaTask(`${__dirname}/${taskFile}`);

            if (fileTask !== null) {
                evaTaskList[_.split(taskFile, '.')[0]] = fileTask;
            }
        }
    });
    console.log('result', evaTaskList);
}
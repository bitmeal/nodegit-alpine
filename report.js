#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('fast-glob').sync;


const tags_path = './jobs/tags.json';
const jobs_glob = './jobs/status/*.json';

// check for status/tag base file
if(!fs.existsSync(path.resolve(tags_path))) {
    process.exit(1);
}

let tags = require(path.resolve(tags_path));
// {success: $status, run: $run, image: $image, nodegit: $nodegit}
const jobs = glob(jobs_glob).map(f => require(path.resolve(f)));

// gather status info
let report = jobs.reduce((acc, job) => {
        acc[job.image] || (acc[job.image] = {});
        acc[job.image][job.nodegit] = Object.assign(
            {},
            job,
            {
                tags: tags[job.image][job.nodegit],
                link: `https://github.com/bitmeal/nodegit-alpine/runs/${job['run']}`,
                icon: job['success'] ? '`✔`' : '`❌`',
                state: job['success'] ? 'success' : 'failure'
            }
        );
        return acc;
    }, {});

// print output
Object.keys(report).forEach((image) => {
        Object.keys(report[image]).forEach((ng) => {
            let job = report[image][ng];
            console.log('*', `[${job.icon}](${job.link})`, job.tags.map(t => ('`'+t+'`')).join(', '), `[*FROM node:**${job.image}*** | *nodegit@**${job.nodegit}***]`);
        });
    }
);

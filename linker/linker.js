#!/usr/bin/env node

const argv = require('yargs');
const proc = require('child_process')

const fs = require('fs');
const path = require('path');

const chalk = require('chalk');


// hardcoded path (this is intended for single use in one container...)
const npm_bin = '/usr/local/bin/npm';
const npm_spawn_opts = {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit'
};
// install aliases
const npm_i_alias = ['install', 'i', 'add', 'inst', 'in'];


// call npm with given command-line and link 'nodegit' if true
function npm_forward(cmdl, link=false) {
    console.log();
    if(link) {
        console.log(chalk.bgCyan(' NPM '), chalk.yellowBright('linking', chalk.italic('nodegit')));
        proc.spawnSync(
            npm_bin,
            ['link', 'nodegit'],
            npm_spawn_opts
        );
    }
    if(cmdl) {
        console.log(chalk.bgGreen(' NPM '), chalk.green('calling as:'));
        console.log(chalk.green('  $'), [npm_bin, ...cmdl].join(' '));
        proc.spawnSync(
            npm_bin,
            cmdl,
            npm_spawn_opts
        );
    }
}

/*
 * parse npm options and determine what to do:
 *  - install without package names: search for package.json, check for nodegit dependency and link if found
 *  - install with package names: strip all '.*nodegit.*' packages from list, link and forward to npm
 *  - call to another npm command: just forward
 */
console.log(chalk.bgCyan(' NPM '), chalk.cyan('intercepted:'));
console.log(chalk.yellowBright('  - checking for nodegit dependency'));

argv
.parserConfiguration( { /* 'nargs-eats-options': true */ } )
// 
.nargs( process.argv
        .map(a => a.replace(/-/g, ''))
        .filter(a => !a.includes('=')),
        0
)
.command(
    npm_i_alias.map(i => `${i} [pkgs..]`),
    'intercept npm install calls',
    (yargs) => {
        return yargs
            .positional('pkgs', {});
    },
    (iargv) => {
        if(iargv.pkgs.length == 0) {
            console.log(chalk.yellowBright('  - searching for ' + chalk.italic('package.json')));
            
            const paths = Array(
                    process.cwd().split(path.sep).length - 1
                )
                .fill('..')
                .reduce((acc, p)=>{
                    acc.push(path.join(acc.slice(-1)[0], p));
                    return acc;
                }, ['.'])
                .map(p => path.resolve(process.cwd(), p, 'package.json'));
            
            const manifest = paths.reduce((acc, p) => {
                    if(fs.existsSync(p)) {
                        acc.push(p);
                    }
                    return acc;
                }, [])[0];
            
            let pkg = {};
            if(manifest) {
                try {
                    pkg = require(manifest);
                } catch (error) { /* ignore */ }
            }

            let nodegit = Object.values(pkg)
                .filter(v => typeof(v) === 'object' && v != null)
                .map(o => Object.keys(o))
                .flat()
                .includes('nodegit');
            
            if(nodegit) {
                console.log();
                console.log(chalk.bgRed(' NPM ') + chalk.yellowBright(' found', chalk.italic('nodegit'), 'dependency in:', chalk.italic(manifest)));
                // console.log('found nodegit dependency in:', manifest);
            }

            npm_forward(process.argv.slice(2), nodegit);
        }
        else {
            console.log(chalk.yellowBright('  - testing for ' + chalk.italic('nodegit')));

            let nodegit_pkgs = iargv.pkgs.filter(p => p.match(/nodegit/));
            let pkgs = iargv.pkgs.filter(p => !nodegit_pkgs.includes(p));
            
            let cmdl = process.argv.slice(2);

            let nodegit = (iargv.pkgs.length != pkgs.length);
            if(nodegit) {
                // modify command-line and notify user
                cmdl = cmdl.filter(p => !nodegit_pkgs.includes(p));

                console.log();
                console.log(chalk.bgRed(' NPM ') + chalk.yellowBright(' removed  :'), nodegit_pkgs);
                console.log(chalk.bgRed(' NPM ') + chalk.yellowBright(' new list :'), pkgs);
            }

            npm_forward(pkgs.length ? cmdl : null, nodegit);
        }
    }
)
.command('$0', 'npm passthrough', ()=>{}, ()=>{
    console.log();
    console.log(chalk.bgCyan(' NPM '), chalk.cyan('forwarding call...'));
    npm_forward(process.argv.slice(2));
})
.argv;
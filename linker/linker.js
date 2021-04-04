#!/usr/bin/env node

const argv = require('yargs');
const proc = require('child_process')

const fs = require('fs');
const path = require('path');

const log = require('loglevel');
const chalk = require('chalk');

const util = require('util');


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
// returns exit code of operation; if linking fails, will show error and return status of link operation
function npm_forward(cmdl, link=false) {
    log.info('');
    if(link) {
        log.info(chalk.bgCyan(' NPM '), chalk.yellowBright('linking', chalk.italic('nodegit')));
        let ret = proc.spawnSync(
            npm_bin,
            ['link', 'nodegit'],
            npm_spawn_opts
        );

        if(ret.status != 0) {
            log.error(chalk.bgRed(' NPM '), chalk.bgRed(' LINK ERROR '), chalk.red('linking global nodegit failed!'));
            return ret.status;
        }
    }
    if(cmdl) {
        log.info(chalk.bgGreen(' NPM '), chalk.green('calling as:'));
        log.info(chalk.green('  $'), [npm_bin, ...cmdl].join(' '));
        let ret = proc.spawnSync(
            npm_bin,
            cmdl,
            npm_spawn_opts
        );

        return ret.status;
    }
}


// find and load file as object by name from cwd or parent
// intended to find package.json and package-lock.json
function load_pkg_info(name) {
    log.info(chalk.yellowBright('  - searching for', chalk.italic(name)));

    const paths = Array(
            process.cwd().split(path.sep).length - 1
        )
        .fill('..')
        .reduce((acc, p)=>{
            acc.push(path.join(acc.slice(-1)[0], p));
            return acc;
        }, ['.'])
        .map(p => path.resolve(process.cwd(), p, name));

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
            log.info(chalk.yellowBright('  - loading', chalk.italic(name), 'OK'));
        } catch (error) {
            log.error(chalk.redBright('  - loading', chalk.italic(name), 'FAILED'));
        }
    }

    return pkg;
}


//// main
// silence npm linker?
log.setLevel(process.env['NODEGIT_LINK_SILENT'] ? 'silent' : 'info');

// inform about interception
log.info(chalk.bgCyan(' NPM '), chalk.cyan('intercepted:'));

// linking disabled?
if(process.env['NODEGIT_LINK_OFF']) {
    log.info(chalk.bgCyan(' NPM '), chalk.yellow('NODEGIT_LINK_OFF'), chalk.cyan('- forwarding call...'));
    process.exit(npm_forward(process.argv.slice(2)));

}
else {
    // info on interception reason
    log.info(chalk.yellowBright('  - checking for nodegit dependency'));

    /*
    * parse npm options and determine what to do:
    *  - install without package names: search for package.json, check for nodegit dependency and link if found
    *  - install with package names: strip all '.*nodegit.*' packages from list, link and forward to npm
    *  - call to another npm command: just forward
    */
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
                let pkg = load_pkg_info('package.json');
                let pkg_lock = load_pkg_info('package-lock.json');

                let deplist = (mod) => {
                    return Object.keys(mod)
                        .filter(k => (k.includes('dep') || k.includes('req')))
                        .filter(k => typeof(mod[k]) === 'object')
                        .map((d) => {
                            return Array.isArray(mod[d]) ? mod[d] : Object.keys(mod[d]);
                        })
                        .flat();
                };
                
                let deps = {
                    pkg: deplist(pkg),
                    lock: Object.keys(pkg_lock['packages'] || {})
                        .map(p => [p.replace('node_modules/', ''), ...deplist((pkg_lock['packages'] || {})[p])])
                        .flat()
                };
                console.log(util.inspect(deps, {showHidden: false, maxArrayLength: null, colors: true}));

                log.info('');

                let nodegit = false;
                if(deps.pkg.includes('nodegit')) {
                    nodegit = true;
                    log.info(chalk.bgRed(' NPM ') + chalk.yellowBright(' found', chalk.italic('nodegit'), 'dependency from:', chalk.italic('package.json')));
                }
                else if(deps.lock.includes('nodegit')) {
                    nodegit = true;
                    log.info(chalk.bgRed(' NPM ') + chalk.yellowBright(' found', chalk.italic('nodegit'), 'dependency from:', chalk.italic('package-lock.json')));
                }
                
                process.exit(npm_forward(process.argv.slice(2), nodegit));
            }
            else {
                log.info(chalk.yellowBright('  - testing for ' + chalk.italic('nodegit')));

                let nodegit_pkgs = iargv.pkgs.filter(p => p.match(/nodegit/));
                let pkgs = iargv.pkgs.filter(p => !nodegit_pkgs.includes(p));
                
                let cmdl = process.argv.slice(2);

                let nodegit = (iargv.pkgs.length != pkgs.length);
                if(nodegit) {
                    // modify command-line and notify user
                    cmdl = cmdl.filter(p => !nodegit_pkgs.includes(p));

                    log.info('');
                    log.info(chalk.bgRed(' NPM ') + chalk.yellowBright(' removed  :'), nodegit_pkgs);
                    log.info(chalk.bgRed(' NPM ') + chalk.yellowBright(' new list :'), pkgs);
                }

                process.exit(npm_forward(pkgs.length ? cmdl : null, nodegit));
            }
        }
    )
    .command('$0', 'npm passthrough', ()=>{}, ()=>{
        log.info('');
        log.info(chalk.bgCyan(' NPM '), chalk.cyan('forwarding call...'));
        process.exit(npm_forward(process.argv.slice(2)));
    })
    .argv;
}

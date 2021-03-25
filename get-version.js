#!/usr/bin/env node

const argv = require('yargs');
const semver = require('semver');
const npm = require('npm');
const axios = require('axios');
const stream = require('stream');

// build list of minor version with latest patch level
function minor_latest(versions, prerelease = false, count = null) {
    let minors = versions.reduce((acc, v) => {
        let version = semver.parse(v);
        let minor = [version.major, version.minor, 0].join('.');
        if(acc.slice(-1)[0] != minor) {
            acc.push(minor);
        }
        return acc;
    }, []);

    // get highest patch version for each minor
    let patches = minors.reduce((acc, v) => {
        let max_patch = semver.maxSatisfying(versions, `~${v}`);
        if(max_patch) {
            acc.push(
                {
                    '~': v,
                    version: max_patch,
                    prerelease: false
                }
            );
        }
        return acc;
    }, []);

    // truncate first, add prerelease after
    patches = patches.slice(-count);

    // if latest is a prerelease, add it
    if(semver.prerelease(versions.slice(-1)[0]) && prerelease) {
        let p = versions.slice(-1)[0];
        patches.push(
            {
                '~': [semver.major(p), semver.minor(p), 0].join('.'),
                version: p,
                prerelease: true
            }
        );
    }

    return patches;
}

// query npm registry for package versions
// returns: {name, latest, versions[]}
function npm_pkg_versions(pkg, redirect_stdout = false) {
    if(redirect_stdout) {
        console._stdout = stream.Writable();
    }

    let attach_console = () => {
        if(redirect_stdout) {
            console._stdout = process.stdout;
        }
    };

    return new Promise((resolve, reject) => {
        try {
            npm.load((err)=>{
                if(!err) {
                    let view = npm.commands['view'];
                    // override print method as noop
                    view.prettyView = ()=>{};
                    view.printDate = ()=>{};
                    
                    // query registry
                    view
                    .view([pkg, 'versions'])
                    .then((res) => {
                        let latest = Object.keys(res)[0];
                        
                        attach_console();
                        resolve(
                            {
                                name: pkg,
                                latest: latest,
                                versions: res[latest].versions
                            }
                        );
                    });
                }
                else {
                    attach_console();
                    reject(err);
                }
            })                
        } catch (err) {
            attach_console();
            reject(err);
        }
    });
}

// query nodejs versions
function node_versions() {
    return new Promise((resolve, reject) => {
        axios.get('https://nodejs.org/dist/index.json')
        .then((res) => {
            let ret = [];
            if(res.data) {
                ret = res.data.reduce((acc, v) => {
                    let version = semver.parse(v.version);
                    if(!acc.slice(-1)[0] || acc.slice(-1)[0].release != version.major) {
                        acc.push(
                            {
                                version: version.version,
                                release: version.major,
                                lts: v.lts
                            }
                        );
                    }
                    return acc;
                },[]);
            }
            
            resolve(ret);
        })
        .catch((err) => {
            reject(err);
        })
    });
}


// cli
if (require.main === module) {
    argv
    .usage('Usage:\n  $0 <command> [options]')
    .usage('')
    .usage('Command help:\n  $0 <command> --help')
    .alias('n', 'count')
    .describe('n', 'truncate to N latest versions')
    .alias('l', 'list')
    .describe('l', 'output list of patch levels only')
    .describe('pretty', 'pretty print JSON')
    // reads a json formatted list of semver strings from stdin
    .command('parse', 'parse JSON-formatted list of versions from stdin; returns list of minor versions with latest patch level',
        (yargs) => {
            return yargs
            .alias('p', 'prerelease')
            .describe('p', 'add latest prerelease to list, if present. WARN: may yield N+1 results!')
            .alias('l', 'list')
            .describe('l', 'output list of patch levels only')
        },
        (argv) => {
            // read json from stdin
            const stdin = process.stdin;
            const stdout = process.stdout;
            let chunks = [];

            stdin.resume();
            stdin.setEncoding('utf8');

            stdin.on('data', function (chunk) {
                chunks.push(chunk);
            });

            stdin.on('end', function () {
                let ret = minor_latest(JSON.parse(chunks.join('')), argv.p, argv.n || null);
                console.log(
                    JSON.stringify(
                        argv.l ? ret.map(p => p['~']) : ret,
                        null, argv.pretty ? 2 : 0
                    )
                );
            });
        }
    )
    // query npm registry
    .command('package <name>', 'query latest versions for npm-package <name>',
        (yargs) => {
            return yargs
            .positional('name', {
                describe: 'package name',
                type: 'string'
            })
            .alias('l', 'list')
            .describe('l', 'output list of patch levels only')
        },
        (argv) => {
            npm_pkg_versions(argv.name, true)
            .then((versions) => {
                let ret = minor_latest(versions.versions, argv.p, argv.n || argv.count || null);
                console.log(
                    JSON.stringify(
                        argv.l ? ret.map(p => p['~']) : ret,
                        null, argv.pretty ? 2 : 0
                    )
                );
            });
        }
    )
    // query nodejs versions
    .command('node', 'query latest nodejs versions',
        (yargs) => {
            return yargs
            .alias('s', ['name', 'string'])
            .describe('s', 'output lts versions name string only; implies -l/--lts')
            .alias('m', 'major')
            .describe('m', 'output major only')
            .alias('l', 'lts')
            .describe('l', 'show lts releases only')
        },
        (argv) => {
            node_versions()
            .then((versions) => {
                let ret = versions
                    .filter(v => !argv.l || (argv.l && v.lts))
                    .map(v => {
                        if(argv.m) { return v.release; }
                        else if(argv.s) { return v.lts; }
                        else { return v; }
                    })
                    .filter(v => v)
                    .slice(0, argv.n || undefined);
                
                console.log(
                    JSON.stringify(ret, null, argv.pretty ? 2 : 0)
                );
            });
        }
    )
    .demandCommand()
    .help()
    .argv;
}

module.exports.minor_latest = minor_latest;
module.exports.npm_pkg_versions = npm_pkg_versions;
module.exports.node_versions = node_versions;

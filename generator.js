#!/usr/bin/env node

const latest = require('./get-version');
const semver = require('semver');
const argv = require('yargs');


// get 'annotated' list of node/image and nodegit versions
function get_versions(node_versions_count, nodegit_versions_count) {
    return new Promise((resolve) => {
        let node_versions = latest.node_versions();
        let nodegit_versions = latest.npm_pkg_versions('nodegit', true);
        Promise.all([node_versions, nodegit_versions])
        .then((versions) => {
            // filter node versions:
            //  - lts
            //  - latest (if not lts)
            //  - clamp at N items
            let make_image_info = (versions) => {
                return versions.map((v) => {
                    return Object.assign(v, {
                        image: `${v.release}-alpine`,
                        tag_suffixes: [
                            `${v.release}-alpine`,
                            ...(v.lts ? [`${v.lts}-alpine`] : [])
                        ]
                    })
                });
            };

            node_versions = [
                { image: 'lts-alpine', tag_suffixes: ['lts-alpine'] },
                ...make_image_info(
                    ((versions, latest) => {
                        return latest.lts ? versions : [latest, ...versions];
                    })(versions[0].filter(v => v.lts), versions[0][0])
                    .map(v => Object.assign(v, {lts: v.lts ? v.lts.toLowerCase() : v.lts}))
                    .slice(0, node_versions_count)
                )
            ];
            
            // filter nodegit versions:
            //  - with prerelease
            //  - clamp at N items
            //  - add 'tag'
            //  - add 'prefix'es
            let make_prefixes = (versions) => {
                return [
                    Object.assign(versions[0], {tag_prefixes: ['', 'latest', versions[0].tag]}),
                    ...versions.slice(1).map(v => Object.assign(v, {tag_prefixes: [v.tag]}))
                ]
            };

            nodegit_versions = make_prefixes(
                latest
                .minor_latest(versions[1].versions, true, nodegit_versions_count)
                .map((v) => {
                    version = semver.parse(v['~']);
                    v['tag'] = [version.major, version.minor].join('.');
                    return v;
                })
                .reverse()
            );

            resolve(
                {
                    node: node_versions,
                    nodegit: nodegit_versions
                }
            );
        });
    });
}


// build list of node/image and nodegit versions to build containers for
function make_build_info(node_versions, nodegit_versions) {
    // compile combination of images, nodegit versions and tags
    return [
        // "static" latest/current alpine + latest nodegit (explicitly use latest [alpine, current-alpine] and not latest from node versions)
        {
            image: 'alpine',
            variants: [
                {
                    nodegit: nodegit_versions[0].version,
                    tags: ['alpine', 'current-alpine', 'latest-current-alpine']
                }
            ]
        },
        ...node_versions.map((n) => {
            return {
                image: `${n.image}`,
                variants: [
                    ...nodegit_versions.map(v => (
                        {
                            nodegit: v.version,
                            tags: v.tag_prefixes.map(
                                    p => [
                                        ...n.tag_suffixes.map(
                                            s => `${p}${p?'-':''}${s}`
                                        )
                                    ]
                                )
                                .flat()
                                .flat()
                                .sort()
                        }
                    ))
                ]
            }
        })
    ]
}


// generate docker buildx --tag options for access by matrix values
function make_buildx_tags(builds, image_name) {
    return builds.reduce((acc, image) => {
        acc[image.image] = image.variants.reduce((acc, version) => {
            acc[version.nodegit] = version.tags.map(t => `--tag ${image_name}:${t}`).join(' ')
            return acc;
        }, {})
        return acc;
    }, {});
}

// generate docker tags for access by matrix values
function make_tags(builds) {
    return builds.reduce((acc, image) => {
        acc[image.image] = image.variants.reduce((acc, version) => {
            acc[version.nodegit] = version.tags;
            return acc;
        }, {})
        return acc;
    }, {});
}

// generate testing image names for access by matrix values
function make_test_images(builds, image_name) {
    return builds.reduce((acc, image) => {
        acc[image.image] = image.variants.reduce((acc, version) => {
            acc[version.nodegit] = `${image_name}:${version.tags[0]}`
            return acc;
        }, {})
        return acc;
    }, {});
}


// generate github actions matrix
function make_matrix(node_versions, nodegit_versions) {
    unnamed_idx = 0;
    include = [];

    // skip prereleases
    while(semver.prerelease(nodegit_versions[unnamed_idx].version))
    {
        // // if first prerelease add as version 'next'
        // if(!unnamed_idx)
        // {
        //     include.push({ image: 'next-alpine', nodegit: nodegit_versions[unnamed_idx].version });
        // }
        unnamed_idx++;
    }

    include.push({ image: 'alpine', nodegit: nodegit_versions[unnamed_idx].version });


    return {
        image: node_versions.map(v => v.image),
        nodegit: nodegit_versions.map(v => v.version),
        include
    }
}


// generate list of used node and nodegit versions
//  > to be used for new releases detection
function make_version_info(node_versions, nodegit_versions) {
    return {
        node: node_versions.map(v => v.version).filter(v => v),
        nodegit: nodegit_versions.map(v => v.version)
    }
}


// cli
if (require.main === module) {
    // build node + nodegit version selection and docker tags
    argv
    .usage('Usage:\n  $0 <imagename> [options]')
    .command('$0 <imagename> [options]', 'generate container build data',
        (yargs) => {
            return yargs
            .alias('n', 'node-versions')
            .describe('n', 'number of node versions to build containers for')
            .alias('g', 'nodegit-versions')
            .describe('g', 'number of nodegit versions to build containers for')
            .positional('imagename', {})
            .demandOption(['n', 'g'])
        },
        (argv) => {
            const node_versions_count = argv.n;
            const nodegit_versions_count = argv.g;
        
            const image_name = argv.imagename;
        
            get_versions(node_versions_count, nodegit_versions_count)
            .then((versions) => {
                let builds = make_build_info(versions.node, versions.nodegit);
                let buildx_tags = make_buildx_tags(builds, image_name);
                let test_images = make_test_images(builds, image_name);
                let tags = make_tags(builds);
                let matrix = make_matrix(versions.node, versions.nodegit);
                let version_info = make_version_info(versions.node, versions.nodegit);
        
                console.log(
                    JSON.stringify(
                        {
                            matrix: matrix,
                            buildx: buildx_tags,
                            tags: tags,
                            'test-images': test_images,
                            'version-info': version_info
                        },
                        null, 2
                    )
                );
            });
        }
    )
    .argv;
}
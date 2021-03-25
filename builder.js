#!/usr/bin/env node

const latest = require('./latest');
const semver = require('semver');

const util = require('util');

// build node + nodegit version selection and docker tags
const node_versions_count = 3;
const nodegit_versions_count = 4;

// get versions
let node_versions = latest.node_versions();
let nodegit_versions = latest.npm_pkg_versions('nodegit', true);
Promise.all([node_versions, nodegit_versions])
.then((versions) => {
    // filter node versions:
    //  - lts
    //  - latest (if not lts)
    //  - clamp at N items
    node_versions =
        ((versions, latest) => { return latest.lts ? versions : [latest, ...versions]; })
        (versions[0].filter(v => v.lts), versions[0][0])
        .map(v => Object.assign(v, {lts: v.lts ? v.lts.toLowerCase() : v.lts}))
        .slice(0, node_versions_count)
    
    // filter nodegit versions:
    //  - no prerelease
    //  - clamp at N items
    nodegit_versions =
        latest
        .minor_latest(versions[1].versions, false, nodegit_versions_count)
        .map((v) => {
            version = semver.parse(v['~']);
            v['tag'] = [version.major, version.minor].join('.');
            return v;
        })
        .reverse();

    
    // compile combination of images, nodegit versions and tags
    builds = [
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
        // "static" lts image (explicitly use 'lts' tagged image and not latest from node lts versions)
        {
            image: 'lts-alpine',
            variants: [
                {
                    nodegit: nodegit_versions[0].version,
                    tags: ['lts-alpine', 'latest-lts-alpine', `${nodegit_versions[0].tag}-lts-alpine`]
                },
                ...nodegit_versions.slice(1).map(v => (
                    {
                        nodegit: v.version,
                        tags: [`${v.tag}-lts-alpine`]                            
                    }
                ))
            ]
        },
        ...node_versions.map((n) => {
            return {
                image: `${n.release}-alpine`,
                variants: [
                    {
                        nodegit: nodegit_versions[0].version,
                        tags: [
                            `${n.release}-alpine`, `latest-${n.release}-alpine`,
                            ...(n.lts ? [`${n.lts}-alpine`, `latest-${n.lts}-alpine`] : []),
                            `${nodegit_versions[0].tag}-${n.release}-alpine`,
                            ...(n.lts ? [`${nodegit_versions[0].tag}-${n.lts}-alpine`] : [])
                        ]
                    },
                    ...nodegit_versions.slice(1).map(v => (
                        {
                            nodegit: v.version,
                            tags: [
                                `${v.tag}-${n.release}-alpine`,
                                ...(n.lts ? [`${v.tag}-${n.lts}-alpine`] : [])
                            ]
                        }
                    ))
                ]
            }
        })
    ]
    
    // console.log(
    //     JSON.stringify(builds, null, 2)
    // );
});
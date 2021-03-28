# `nodegit:alpine`
A `node:alpine` based container with precompiled nodegit


```bash
docker pull bitmeal/nodegit:alpine
```
> view @ [Docker HUB](https://hub.docker.com/r/bitmeal/nodegit) 🚢

## important infos
How does it work?
* nodegit is installed globally in `/usr/local/lib/node_modules`
* the `npm` binary is masked from `/opt/linker/bin/npm` and `npm` calls are intercepted and evaluated
* the global nodegit version is *linked* (`npm link nodegit`), if a dependency on nodegit is detected (from `package.json` or directly)

Options
* `NODEGIT_LINK_SILENT=true` disables output of `npm` interception and link process
* `NODEGIT_LINK_OFF=true` disables 'nodegit linker' and forwards calls to `npm`

> ⚡ when debugging, remember that `npm` is masked and calls are intercepted
> 
> ⚡ to *install* (read: fetch as dependency) nodegit manually, call `npm link nodegit`
> 
> ⚡ to call `npm` directly, use `/usr/local/bin/npm`
>
> ⚠ **don't try to use this container to add a nodegit dependency to a project that did not depend on it beforehand! running `npm install nodegit` will not add it to your `package.json`!**


## why?
*Because nodegit is nice for automation!*

*Because nodegit in a container is **pain!***


You developed some helper script for your CI workflow using nodegit while testing locally? Nice! Of course, you love alpine containers, too! They are fast, small and the image pulls in seconds - even without caching.

You then found your container to fail while installing nodegit? Yes, it wants to be compiled from source! The solution? Provide a complete build toolchain and just build it - fair enough. But it takes 5-10 minutes with your free CI plan and low resources. But hey, we have caching for our container layers in most CI solutions! Except if we don't... Own GitLab-runner and somebody forgot to set up caching? Your jobs running infrequently and the cache ttl is too short?

We just lost all benefits of **small containers** and increased our jobs' runtime by 5-10 minutes each. We want back these benefits: **fast**, **small** in **size** and **memory footprint**, **pulled in seconds**. ***And that is why!***

## versions
Builds images for the latest *N* node.js versions and latest *M* nodegit versions (visit docker hub to find *N* and *M*). `lts-alpine` and `alpine` are referenced directly as base image, to avoid mismatches between official node images and these nodegit images.

Tags follow the official node image convention, introducing an additional leading versioning component. Images may be referenced as shown below.

`alpine`, as `current-alpine` is built against latest nodegit version only! To use a specific version of nodegit, you have to use a specific version of node.js as well. Omitting a version specification for nodegit will get you `latest`. 

*No versioning of alpine versions!* Nodejs and nodegit versioning only.

```
[<nodegit-version>-][<node-version>-]alpine
```

* `alpine`, `current-alpine`, `latest-current-alpine`: latest nodegit version, based on `alpine`/`current-alpine`
* `lts-alpine`, `latest-lts-alpine`: latest nodegit version, based on `lts-alpine`
* `<nodegit-version>-lts-alpine`: specified nodegit version, based on `lts-alpine`
* `<name>-alpine`, `<major-version>-alpine`: latest nodegit version, based on respective node image (e.g. `14-alpine`/`fermium-alpine`)
* `<nodegit-version>-<name>-alpine`, `<nodegit-version>-<major-version>-alpine`: specified nodegit version, based on respective node image
* ⚡ **No explicit `latest` tag!** `node:latest` refers to a debian based image and breaks the naming convention

## platforms
* `linux/amd64`
* `linux/arm64`
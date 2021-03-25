# `nodegit:alpine`
A `node:alpine` based container with precompiled nodegit

## why?
*Because nodegit is nice for automation!*

*Because nodegit in a container is **pain!***


You developed some helper script for your CI workflow using nodegit while testing locally? Nice! Of course, you love alpine containers, too! They are fast, small and the image pulls in seconds - even without caching.

You then found your container to fail while installing nodegit? Yes, it wants to be compiled from source! The solution? Provide a complete build toolchain and just build it - fair enough. But it takes 5-10 minutes with your free CI plan and low resources. But hey, we have caching for our container layers in most CI solutions! Except if we don't... Own GitLab-runner and somebody forgot to set up caching? Your jobs running infrequently and the cache ttl is too short?

We just lost all benefits of **small containers** and increased our jobs' runtime by 5-10 minutes each. We want back these benefits: **fast**, **small** in **size** and **memory footprint**, **pulled in seconds**. ***And that is why!***

## versions
Builds images for the latest 3 node.js versions and latest 4 nodegit versions. `lts-alpine` and `alpine` are referenced directly to avoid mismatches between official node images and these nodegit images.

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
* ⚡ **No `latest` tag!** `latest` refers to a debian based image for `node:latest`

# info
## quickstart
```bash
🚢$ docker run bitmeal/nodegit:alpine
```

📄 **[`Dockerfile`](https://github.com/bitmeal/nodegit-alpine/blob/master/Dockerfile)**

🗃 [bitmeal/nodegit-alpine](https://github.com/bitmeal/nodegit-alpine)*@github*

📌***tags***: `[<nodegit-version>-][<node-version>-]alpine`

⚡ `npm` binary is masked - *[visit repo for more infos](https://github.com/bitmeal/nodegit-alpine)*


## options
* `NODEGIT_LINK_SILENT`: disables output of `npm` interception and link process
* `NODEGIT_LINK_OFF`: disables automatic nodegit linking


## overview
> *A precompiled nodegit version and some sugar 🍭 in a `node:alpine` container.*

* nodegit is installed as a global module
* the global nodegit module will get linked automatically, when a nodegit dependency is detected
* calls to `npm` are intercepted and evaluated for automatic linking
* call `npm` directly as `/usr/local/bin/npm`
* *manuallly* 'fetch' nodegit as a dependency npm `npm install`, `npm link nodegit` or `/usr/local/bin/npm install --link`

# tags
[![builder](https://github.com/bitmeal/nodegit-alpine/actions/workflows/builder.yml/badge.svg)](https://github.com/bitmeal/nodegit-alpine/actions/workflows/builder.yml)

*This list is updated automatically, **for the latest build**, in sync with the container images. The build badge tells wether all containers built successfully, or any failed. The build status per tag (-group) tells wether the tags are included in the last build. Previous versions may be available for tags with failed builds.*

**tags format**: `[<nodegit-version>-][<node-version>-]alpine`


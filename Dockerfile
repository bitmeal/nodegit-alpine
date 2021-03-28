ARG ALPINE_TAG

# compile nodegit
# install 'npm linker'
FROM node:${ALPINE_TAG} AS builder
ARG NODEGIT_VERSION

RUN \
    apk add build-base python libgit2-dev krb5-dev libssh-dev && \
    npm config set --global user 0 && npm config set --global unsafe-perm true && \
    BUILD_ONLY=true npm install --global nodegit@${NODEGIT_VERSION} && \
    rm -rf /usr/local/lib/node_modules/nodegit/vendor

WORKDIR /opt/linker
ADD linker .
RUN chmod +x linker.js && npm install && mkdir bin && ln linker.js ./bin/npm


# runner container without bloat
FROM node:${ALPINE_TAG}
ARG NODEGIT_VERSION

COPY --from=builder /usr/local/lib/node_modules/nodegit /usr/local/lib/node_modules/nodegit/
COPY --from=builder /opt/linker /opt/linker/

RUN \
    apk add libgit2 krb5-libs libssh ca-certificates && \
    npm config set --global unsafe-perm true


# ADD .profile /root/
# ENV ENV=/root/.profile

ENV PATH="/opt/linker/bin:${PATH}"
ENV NODEGIT_VERSION="${NODEGIT_VERSION}"

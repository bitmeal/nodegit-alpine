#!/bin/sh


chmod +x test.js

cat << EOF > package.json
{
  "name": "test",
  "version": "1.0.0",
  "main": "test.js",
  "dependencies": {
    "nodegit": "${NODEGIT_VERSION}"
  }
}
EOF

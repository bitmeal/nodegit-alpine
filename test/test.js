#!/usr/bin/env node

const nodegit = require('nodegit');
nodegit.Clone.clone('https://github.com/nodegit/nodegit/', 'nodegit', {})
	.then(() => {
		console.log('nodegit [ OK ]');
		process.exit(0);
	})
	.catch((e) => {
		console.log('nodegit [ ERROR ]\n');
		console.log(e);
		process.exit(1);
	});

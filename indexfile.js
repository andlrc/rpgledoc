"use strict";

const fs = require('fs');

function isspace(c)
{
	return (c == '\t' || c == ' ');
}

function indexfile(infile, callback)
{
	let content = fs.readFileSync(infile).toString();

	const docs = {
		file: infile,
		tags: [],
		content: content
	};
	let doc;

	const scope = {
		proc: '',
		ds: '',
		pi: ''
	};

	const DOC_OUT    = 0;	/* Searching for documentation */
	const DOC_NAME   = 1;	/* Searching for a reference name */
	const DOC_SDESC  = 2;	/* Short description (First line of documentation) */
	const DOC_LDESC  = 3;	/* Long description (Continues lines of documentation) */
	const DOC_SEE    = 4;	/* @see    $REF */
	const DOC_SEEC   = 5;	/* @see    $REF */
	const DOC_PARAM  = 6;	/* @param  $ARG $DESC */
	const DOC_PARAMC = 7;	/* @param  $ARG $DESC */
	const DOC_RETURN = 8;	/* @return $DESC */

	let state = DOC_OUT;

	content.split(/\r?\n/).forEach((line, lineno) => {
		lineno++;
		if (line.length == 0)
			return;		/* Skip empty lines */

		if (state == DOC_NAME) {
			let m;
			if ((m = line.match(/^\s*dcl-(proc|ds|s|c)\s+(\w+)/))) {
				doc.type = m[1];
				doc.refname = m[2];
			} else {
				doc.type = '';
				doc.name = '';
			}

			doc.exported = /\bexport\b/.test(line);

			state = DOC_OUT;
			/* Fall through */
		}
		if (state == DOC_OUT) {
			if (!scope.pi) {
				let m;
				/* We need to capture something to please String.match, hence the
				 * wierd capturing group below */
				if ((m = line.match(/^\s*dcl-pi\s+\*n\s*((?:\s+\S*\s*)?;)/i))
				    && !/\bend-pi\b/.test(line)) {
					scope.pi = m[1].trim().slice(0, -1) || '-';
					if (doc && doc.refname == scope.proc)
						doc.tag_return.type = scope.pi;
				}
			} else {
				if (/^\s*end-pi\b/i.test(line)) {
					scope.pi = '';
				} else if (doc && doc.refname == scope.proc) {
					/* Update current doc with proper types for the params */
					let m;
					if ((m = line.match(/^\s*(\w+)\s+(\S+(?=;|\s))/))) {
						doc.tag_params.some((param) => {
							if (param.arg == m[1]) {
								param.type = m[2];
								param.line = lineno;
								return true;
							}
						});
					}
				}
			}

			if (!scope.ds) {
				let m;
				if ((m = line.match(/^\s*dcl-ds\s+(\w+)/i))
				    && !/\bend-ds\b|\blikeds\b/.test(line))
					scope.ds = m[1];
			} else {
				if (/^\s*end-ds\b/i.test(line)) {
					scope.ds = '';
				} else if (doc && doc.refname == scope.ds) {
					/* Update current doc with proper types for the params */
					let m;
					if ((m = line.match(/^\s*(\w+)\s+(\S+(?=;|\s))/))) {
						doc.tag_params.some((param) => {
							if (param.arg == m[1]) {
								param.type = m[2];
								param.line = lineno;
								return true;
							}
						});
					}
				}
			}

			if (!scope.proc) {
				let m;
				if ((m = line.match(/^\s*dcl-proc\s+(\S+)/i)))
					scope.proc = m[1];
			} else {
				if (/^\s*end-proc\b/i.test(line))
					scope.proc = '';
			}

			if (/^\s*\/\*\*/.test(line)) {
				state = DOC_SDESC;

				doc = {
					line: lineno,
					scope: Object.assign({}, scope),
					exported: false,
					type: '',		/* proc, ds, s, c, or '' */
					refname: '',		/* procedure, structure, ... name */
					short_desc: '',		/* one time description */
					long_desc: '',		/* ...continuesly lines */
					tag_see: [],		/* @see    $REFNAME */
					tag_params: [],		/* @param  $ARG $DESC */
					tag_return: {		/* @return $DESC */
						type: '-',
						desc: ''
					}
				};
				docs.tags.push(doc);
			}
			return;		/* Next line */
		}

		if (/\*\/\s*$/.test(line)) {
			state = DOC_NAME;
			return;		/* Next line */
		}

		/* Remove comment leader */
		line = line.replace(/^\s*\*\s*/gm, '');

		if (line[0] == '@') {
			if (line.startsWith('@see') && isspace(line[4])) {
				state = DOC_SEE;
				line = line.slice(4);
			} else if (line.startsWith('@param') && isspace(line[6])) {
				state = DOC_PARAM;
				line = line.slice(6);
			} else if (line.startsWith('@return') && isspace(line[7])) {
				state = DOC_RETURN;
				line = line.slice(7);
			} else {
				throw new Error(line.split(/\s+/).shift() + ': unknown tag');
			}
		}

		line = line.trim();

		switch (state) {
		case DOC_SDESC:
			doc.short_desc = line;
			state = DOC_LDESC;
			break;
		case DOC_LDESC:
			if (!doc.long_desc)
				doc.long_desc = line;
			else
				doc.long_desc += ' ' + line;
			break;
		case DOC_SEE:
			doc.tag_see.push(line);
			state = DOC_SEEC;
			break;
		case DOC_SEEC:
			doc.tag_see[doc.tag_see.length - 1] += ' ' + line;
			break;
		case DOC_PARAM:
			/*
			 * Read of first word as "arg",
			 * store the rest in "desc"
			 */
			let i;
			let arg = '';
			for (i = 0; i < line.length; i++) {
				if (isspace(line[i]))
					break;
				arg += line[i];
			}
			doc.tag_params.push({
				arg: arg,
				type: '-',
				line: lineno,
				desc: line.slice(i).trim()
			});
			state = DOC_PARAMC;
			break;
		case DOC_PARAMC:
			doc.tag_params[doc.tag_params.length - 1].desc += ' ' + line;
			break;
		case DOC_RETURN:
			if (!doc.tag_return.desc)
				doc.tag_return.desc = line;
			else
				doc.tag_return.desc += ' ' + line;
			break;
		}
	});

	return docs;
}

module.exports = indexfile;

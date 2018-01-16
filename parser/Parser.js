"use strict";

const fs = require('fs');

function isspace(c)
{
	return (c === '\t' || c === ' ');
}

function isblank(c)
{
	return isspace(c) || c === void 0;
}

function Parser(infile)
{
	this.file = infile;
	this.tags = [];
	this.lines = [];

	this.readFile();
	this.parse();
}

Parser.prototype.toJSON = function()
{
	return {
		file: this.file,
		tags: this.tags,
		lines: this.lines
	};
}

Parser.prototype.readFile = function()
{
	this.lines = fs.readFileSync(this.file).toString().split(/\r?\n/);
}

Parser.prototype.parse = function()
{
	let doc;

	const scope = {
		proc: '',
		ds: '',
		pi: '',
		pr: ''
	};
 
	const DOC_OUT        = 0;	/* Searching for documentation */
	const DOC_NAME       = 1;	/* Searching for a reference name */
	const DOC_SDESC      = 2;	/* Short description (First line of documentation) */
	const DOC_LDESC      = 3;	/* Long description (Continues lines of documentation) */
	const DOC_SEE        = 4;	/* @see    $REF */
	const DOC_SEEC       = 5;	/* @see    $REF */
	const DOC_PARAM      = 6;	/* @param  $ARG $DESC */
	const DOC_PARAMC     = 7;	/* ...$DESC */
	const DOC_RETURN     = 8;	/* @return $DESC */
	const DOC_EXAMPLE    = 9;	/* @example $TITLE */
	const DOC_EXAMPLEC   = 10;	/* $CODE */
	const DOC_DEPRECATED = 11;	/* @deprecated $DESC */

	let state = DOC_OUT;

	this.lines.forEach((orig_line, lineno) => {
		lineno++;
		if (orig_line.length == 0)
			return;		/* Skip empty lines */

		let line = orig_line;

		if (state == DOC_NAME) {
			let m;
			if ((m = line.match(/^\s*dcl-(proc|ds|s|c|pr)\s+(\w+)/))) {
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
				const r = /^\s*dcl-pi\s+\*n\b/;
				if (r.test(line) && !/\bend-pi\b/.test(line)) {
					let m;
					if ((m = line.match(/^\s*dcl-pi\s+\*n\s+(\S+);/i)))
						scope.pi = m[1];
					else
						scope.pi = '-';
					if (doc && doc.refname == scope.proc)
						doc.tag_return.type = scope.pi;
				}
			} else {
				if (/^\s*end-pi\b/i.test(line)) {
					scope.pi = '';
				} else if (doc && doc.refname == scope.proc) {
					/* Update current doc with proper types for the params */
					let m;
					if ((m = line.match(/^\s*(\w+)\s+(.*?);/))) {
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
					if ((m = line.match(/^\s*(\w+)\s+(.*?);/))) {
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

			if (!scope.pr) {
				let m;
				if ((m = line.match(/^\s*dcl-pr\s+(\w+)/i))
				    && !/\bend-pr\b|\blikeds\b/.test(line))
					scope.pr = m[1];
			} else {
				if (/^\s*end-pr\b/i.test(line)) {
					scope.pr = '';
				} else if (doc && doc.refname == scope.pr) {
					/* Update current doc with proper types for the params */
					let m;
					if ((m = line.match(/^\s*(\w+)\s+(.*?);/))) {
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
				if ((m = line.match(/^\s*dcl-proc\s+(\S+(?=\s+export|\s*;))/i)))
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
					},
					tag_example: [],	/* @example $TITLE NL $CODE */
					tag_deprecated: {	/* @deprecated $DESC */
						deprecated: false,
						desc: ''
					}
				};
				this.tags.push(doc);
			}
			return;		/* Next line */
		}

		if (/\*\/\s*$/.test(line)) {
			state = DOC_NAME;
			return;		/* Next line */
		}

		/* Remove comment leader */
		line = line.replace(/^\s*\*/g, '');

		/* Keep a line with original indent as it's used for examples */
		const indented_line = line;
		line = indented_line.trim();

		if (line[0] == '@') {
			if (line.startsWith('@see') && isblank(line[4])) {
				state = DOC_SEE;
				line = line.slice(4);
			} else if (line.startsWith('@param') && isblank(line[6])) {
				state = DOC_PARAM;
				line = line.slice(6);
			} else if (line.startsWith('@return') && isblank(line[7])) {
				state = DOC_RETURN;
				line = line.slice(7);
			} else if (line.startsWith('@example') && isblank(line[8])) {
				state = DOC_EXAMPLE;
				line = line.slice(8);
			} else if (line.startsWith('@deprecated') && isblank(line[11])) {
				state = DOC_DEPRECATED;
				line = line.slice(11);
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
		case DOC_EXAMPLE:
			doc.tag_example.push({
				title: line,
				lines: []
			});
			state = DOC_EXAMPLEC;
			break;
		case DOC_EXAMPLEC:
			const ex_lines = doc.tag_example[doc.tag_example.length - 1].lines;
			ex_lines.push(indented_line);
			break;
		case DOC_DEPRECATED:
			doc.tag_deprecated.deprecated = true;
			if (!doc.tag_deprecated.desc)
				doc.tag_deprecated.desc = line;
			else
				doc.tag_deprecated.desc += ' ' + line;
			break;
		}
	});
}

module.exports = Parser;

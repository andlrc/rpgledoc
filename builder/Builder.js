"use strict";

const fs = require('fs');
const path = require('path');
const util = require('./util.js');

const OUT_DIR = 'rpgledoc-html';

function Builder(indicies)
{
	this.indicies = indicies;
	this.ensureOutputDirectory();

	this.renderIndicies();
	this.renderSourceViews();
}

Builder.prototype.ensureOutputDirectory = function()
{
	try {
		const stat = fs.statSync(OUT_DIR);
		if (!stat.isDirectory()) {
			throw new Error(OUT_DIR + ': is not a directory');
		}
	} catch (e) {
		if (e.code == 'ENOENT')		/* Create output directory */
			fs.mkdirSync(OUT_DIR);
		else
			throw e;
	}
}

Builder.prototype.writeHead = function(outfp, title)
{
	outfp.write(`<!DOCTYPE html><html lang="en"><head>`);
	outfp.write(`<meta charset="utf-8">`);
	outfp.write(`<title>${util.escapeHtml(title)}</title>`);
	outfp.write(`<link rel="stylesheet" href="https://unpkg.com/chota@0.4.2/dist/chota.min.css">`);
	outfp.write('<style>');
	outfp.write('pre li,details summary{cursor:pointer}');
	outfp.write('pre li:target{background:#eeeeee;}');
	outfp.write('</style>');
	outfp.write('</head><body>');
}

Builder.prototype.writeFoot = function(outfp)
{
	outfp.write('</body></html>');
}

Builder.prototype.renderIndicies = function()
{
	const outfile = path.join(OUT_DIR, 'index.html');
	const outfp = fs.createWriteStream(outfile);
	this.writeHead(outfp, 'Index');
	outfp.write('<style>');
	outfp.write('body{max-width:750px;margin:0 auto;}');
	outfp.write('section{margin-bottom:60px;}');
	outfp.write('table{width:100%;}');
	outfp.write('td{border:2px solid white;background-color:#eeeeee;padding:5px;vertical-align:top;}');
	outfp.write('details{margin-bottom: 15px;}');
	outfp.write('</style>');
	this.indicies.forEach(index => {
		this.renderIndex(outfp, index);
	});
	outfp.close();
}

Builder.prototype.renderIndex = function(outfp, index)
{
	const fileName = path.basename(index.file);
	index.tags.forEach(tag => {
		outfp.write(`<section id="ref:${tag.refname}">`);
		outfp.write(`<header>`);
		outfp.write(`<h3><a href="${fileName}.html#line:${tag.line}">`);
		outfp.write(tag.refname);
		if (tag.type == "proc") {
			outfp.write(`(`);
			tag.tag_params.forEach((param, ix) => {
				if (ix > 0)
					outfp.write(' : ');
				outfp.write(param.arg);
			});
			outfp.write(`)`);
		}
		outfp.write(`</a></h3>`);
		outfp.write(`<summary><p>${util.interpretMarkers(util.escapeHtml(tag.short_desc))}</summary>`);
		outfp.write(`</header>`);
		outfp.write(`${util.interpretMarkers(tag.long_desc)}`);

		outfp.write(`<details open><summary>Details</summary>`);
		outfp.write(`<table>`);
		outfp.write(`<tr>`);
		outfp.write(`<td>File</td>`);
		outfp.write(`<td width="100%">${fileName}</td>`);
		outfp.write(`</tr>`);
		outfp.write(`<tr>`);
		outfp.write(`<td>Exported</td>`);
		outfp.write(`<td width="100%">${tag.exported ? "Yes" : "No"}</td>`);
		outfp.write(`</tr>`);
		outfp.write(`<tr>`);
		if (tag.tag_deprecated.deprecated) {
			outfp.write(`<td>Deprecated</td>`);
			outfp.write(`<td>${tag.tag_deprecated.desc || "Yes"}</td>`);
		}
		outfp.write(`</tr>`);
		outfp.write(`</table>`);
		outfp.write(`</details>`);

		if (tag.tag_params.length || tag.tag_return.desc) {
			outfp.write(`<details open><summary>${tag.type === "ds" ? "Fields" : "Interface"}</summary>`);
			outfp.write(`<table>`);
			if (tag.tag_return.desc) {
				outfp.write(`<tr>`);
				outfp.write(`<td>returns</td>`);
				outfp.write(`<td>${tag.tag_return.type.replace(/ /g, '&nbsp;')}</td>`);
				outfp.write(`<td width="100%">${util.interpretMarkers(util.escapeHtml(tag.tag_return.desc))}</td>`);
				outfp.write(`</tr>`);
			}
			tag.tag_params.forEach(param => {
				outfp.write(`<tr>`);
				outfp.write(`<td><a href="${fileName}.html#line:${param.line}">${param.arg}</a></td>`);
				outfp.write(`<td>${param.type.replace(/ /g, '&nbsp')}</td>`);
				outfp.write(`<td>${util.interpretMarkers(util.escapeHtml(param.desc))}</td>`);
				outfp.write(`</tr>`);
			});
			outfp.write(`</table>`);
		}
		outfp.write(`</details>`);

		if (tag.tag_example.length) {
			outfp.write(`<details open><summary>Examples</summary>`);
			tag.tag_example.forEach((example, ix) => {
				const title = example.title ? util.interpretMarkers(example.title) : `Example #${ix + 1}`;
				outfp.write(`<h4>${title}</h4>`);
				this.renderCode(outfp, example.lines, `${tag.refname}:${ix}`);
			});
			outfp.write(`</details>`);
		}

		if (tag.tag_see.length) {
			outfp.write(`<details open><summary>See Also</summary><ul>`);
			tag.tag_see.forEach(see => {
				outfp.write(`<li>${util.interpretMarkers('{@link ' + see + '}')}`);
			});
			outfp.write(`</ul></details>`);
		}

		outfp.write(`</section>`);
	});
}

Builder.prototype.renderSourceViews = function()
{
	this.indicies.forEach((index) => {
		const outfile = path.join(OUT_DIR, path.basename(index.file) + '.html');
		const outfp = fs.createWriteStream(outfile);
		this.writeHead(outfp, path.basename(index.file));
		this.renderSourceView(outfp, index);
		this.writeFoot(outfp);
		outfp.close();
	});
}

Builder.prototype.renderSourceView = function(outfp, index)
{
	this.renderCode(outfp, index.lines);
}

Builder.prototype.renderCode = function(outfp, lines, ns)
{
	/* ns = optional */
	const TAB_SIZE = 8;

	/* Mesure length of initial spaces and trim those from each line */
	let spaces = 0;
	for (let i = 0; i < lines[0].length; i++) {
		if (lines[0][i] === ' ')
			spaces++;
		else if (lines[0][i] === '\t') {
			spaces = spaces - (spaces % TAB_SIZE) + TAB_SIZE;
		}
		else
			break;
	}
	let trimSpace_r = new RegExp(`^\\s{0,${spaces}}`);

	outfp.write('<pre><ol>');
	lines.forEach((line, lineno) => {
		lineno++;
		line = line.replace(trimSpace_r, '');
		if (line === '')
			line = '&nbsp;'
		else
			line = util.escapeHtml(line);
		outfp.write(`<li onclick="location.hash='${lineref(lineno)}'" id="${lineref(lineno)}"><code>${line}</code>`);
	});
	outfp.write('</ol></pre>');

	function lineref(lineno)
	{
		if (ns)
			return `${ns}:line:${lineno}`;
		else
			return `line:${lineno}`;
	}
}

module.exports = Builder;

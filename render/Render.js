"use strict";

const fs = require('fs');
const util = require('./util.js');
const path = require('path');
const pug  = require('pug');
const pgminfo = require('../package.json');

const OUT_DIR = 'rpgledoc-html';
const VIEW_DIR = path.join(__dirname, '..', 'views');

function Render(indicies)
{
	this.indicies = indicies;
	this.ensureOutputDirectory();

	this.renderIndicies();
	this.renderSourceViews();
}

Render.prototype.ensureOutputDirectory = function()
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

Render.prototype.renderIndicies = function()
{
	const outfile = path.join(OUT_DIR, 'index.html');
	const outfp = fs.createWriteStream(outfile);
	const html = pug.renderFile(path.join(VIEW_DIR, 'indicies.pug'), Object.assign({
		util: util,
		pgminfo: pgminfo,
		pageTitle: "Index"
	}, this));
	outfp.write(html);
	outfp.close();
}

Render.prototype.renderSourceViews = function()
{
	this.indicies.forEach((index) => {
		const outfile = path.join(OUT_DIR, index.filename + '.html');
		const outfp = fs.createWriteStream(outfile);
		const html = pug.renderFile(path.join(VIEW_DIR, 'source.pug'), Object.assign({
			util: util,
			pgminfo: pgminfo,
			pageTitle: index.filename
		}, index));
		outfp.write(html);
		outfp.close();
	});
}

module.exports = Render;

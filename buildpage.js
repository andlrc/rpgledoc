"use strict";

const fs = require('fs');
const path = require('path');

/**
 * HTML Escape input
 */
function X(str)
{
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
		'`': '&#x60;'
	};
	return String(str).replace(/[&<>"'`]/g, (key) => map[key]);
}

/**
 * Interpret special doc markers
 */
function Y(str)
{
	/* {@link $REF} */
	return str.replace(/{@link\s+(\S+)}/g, (_, ref) => {
		return `<a href="#ref:${X(ref)}">${XY(ref)}</a>`;
	});
}

/**
 * X then Y
 */
function XY(str)
{
	return Y(X(str));
}

function buildpage(outfp, docs)
{
	const lines = docs.content.split(/\r?\n/);
	if (lines[lines.length - 1] == '')
		lines.pop();	/* Not a line, but a line terminator */

	outfp.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="https://unpkg.com/chota@latest">
	<style type="text/css">
		input {
			margin: 0 0 40px;
			width: 100%;
		}
		section, h1 {
			padding: 20px 0 0;
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
		}
		.code td, pre {
			padding-top: 0;
			padding-bottom: 0;
			margin-top: 0;
			margin-bottom: 0;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>${X(docs.file.split('/').pop())}</h1>
		<input type="search" placeholder="Search" onchange="S(this.value)">
	</div>
	<hr>
	`);
	docs.tags.forEach((doc, index) => {
		outfp.write(`
	<section><div class="container">
		<h2 title="${X(doc.short_desc)}">
			<a name="ref:${X(doc.refname)}" href="#ref:${X(doc.refname)}">${X(doc.refname)}</a>
			<a href="#line:${X(doc.line)}" title="View Source">[S]</a>
			-
			${XY(doc.short_desc)}
		</h2>
		${Y(doc.long_desc)}
		`);

		if (doc.tag_params.length || doc.tag_return.desc) {
			outfp.write(`
		<table>
			<thead>
				<tr>
					<th></th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
			`);
			if (doc.tag_return.desc) {
				outfp.write(`
				<tr>
					<td><strong>Return Value<strong></td>
					<td>${X(doc.tag_return.type)}</td>
					<td>${XY(doc.tag_return.desc)}</td>
				</tr>
				`);
			}
			doc.tag_params.forEach((param) => {
				outfp.write(`
				<tr>
					<td><a href="#line:${X(param.line)}">${X(param.arg)}</a></td>
					<td>${X(param.type)}</td>
					<td>${XY(param.desc)}</td>
				</tr>
				`);
			});
			outfp.write(`
			</tbody>
		</table>
			`);
		}

		if (doc.tag_see.length) {
			outfp.write(`
		<h4>See Also</h4>
		<ul>
			`);
			doc.tag_see.forEach((ref) => {
				outfp.write(`
			<li><a href="#ref:${X(ref)}">${X(ref)}</a>
				`);
			});
			outfp.write(`
		</ul>
			`);
		}

		outfp.write(`
	</div></section>
		`);
	});
	outfp.write(`
	<section><div class="container">
		<table class="code">
			<tbody>
	`);
	lines.forEach((line, lineno) => {
		lineno++;
		outfp.write(`
				<tr>
					<td align="right"><pre><a name="line:${X(lineno)}" href="#line:${X(lineno)}">${X(lineno)}</a></pre></td>
					<td><pre>${line ? X(line) : '&nbsp;'}</pre></td>
				</tr>
		`);
	});
	outfp.write(`
			</tbody>
		</table>
	</div></section>
	<script>
		let query = location.search.slice(1);
		if (query) {
			let I = document.querySelector('input');
			I.value = query;
			search(query);
		}
		function S(query) {
			location.href = '?' + encodeURIComponent(query);
		}
		function search(query) {
			query = query.toLowerCase();
			[].map.call(document.querySelectorAll('h2'), (el) => {
				while (el && el.nodeName.toLowerCase() != 'section')
					el = el.parentNode;
				return el;
			}).forEach((section) => {
				if (section.innerHTML.toLowerCase().includes(query))
					section.style.display = 'block';
				else
					section.style.display = 'none';
			});
		};
	</script>
</body>
</html>
	`);
}
module.exports = buildpage;

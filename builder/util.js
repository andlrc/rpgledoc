/**
 * HTML Escape input
 */
function escapeHtml(str)
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
function interpretMarkers(str)
{
	/* {@link $REF} */
	return str.replace(/{@link\s+(\S+)}/g, (_, ref) => {
		return `<a href="#ref:${escapeHtml(ref)}">${escapeHtml(ref)}</a>`;
	});
}

module.exports = {
	escapeHtml: escapeHtml,
	interpretMarkers: interpretMarkers
};

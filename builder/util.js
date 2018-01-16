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
	const DFT   = 0;
	const TYPE  = 1;
	const VALUE = 2;

	let out = '';
	let state = DFT;
	let marker;

	for (let i = 0; i < str.length; i++) {
		if (state == DFT) {
			if (str[i] == '{' && str[i + 1] == '@') {
				i += 1;
				state = TYPE;
				marker = {
					type: '',
					brackets: 1,
					value: ''
				};
			} else {
				out += str[i];
			}
			continue;
		}
		switch (state) {
		case TYPE:
			if (str[i] !== ' ' && str[i] !== '\t') {
				marker.type += str[i];
			} else {
				state = VALUE;
			}
			break;
		case VALUE:
			if (str[i] == '}')
				marker.brackets--;
			if (str[i] == '{')
				marker.brackets++;

			if (marker.brackets === 0) {
				switch (marker.type) {
				case 'link':
					out += `<a href="#ref:${marker.value}">${marker.value}</a>`;
					break;
				case 'code':
					out += `<code>${marker.value}</code>`;
					break;
				default:
					throw new Error('@' + marker.type + ': unknown marker');
				}
				state = DFT;
			} else {
				marker.value += str[i];
			}
			break;
		}
	}
	return out;
}

module.exports = {
	escapeHtml: escapeHtml,
	interpretMarkers: interpretMarkers
};

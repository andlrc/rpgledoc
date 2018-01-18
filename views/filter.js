const filterOptions = {
	query: '',
	files: [],
	exported: []
};
location.search.slice(1).split('&').forEach(fragment => {
	let m;
	if (!(m = fragment.match(/^([^=]+)=(.*)/)))
		return; /* Ignore fragment */
	const [name, value] = [decodeURIComponent(m[1]), decodeURIComponent(m[2]).replace(/\+/g, ' ')];
	if (name === 'query') {
		filterOptions.query = value;
	} else if (name === 'file[]') {
		filterOptions.files.push(value);
	} else if (name === 'exported[]') {
		filterOptions.exported.push(value);
	}
});
if (filterOptions.query) {
	document.querySelector('[name=query]').value = filterOptions.query;
}
if (filterOptions.files.length) {
	[].forEach.call(document.querySelectorAll('[name="file[]"]'), el => {
		el.checked = filterOptions.files.includes(el.value);
	});
}
if (filterOptions.exported.length) {
	[].forEach.call(document.querySelectorAll('[name="exported[]"]'), el => {
		el.checked = filterOptions.exported.includes(el.value);
	});
}

document.addEventListener('DOMContentLoaded', () => filter(filterOptions));

function filter(options)
{
	let sections = [].slice.call(document.querySelectorAll('section'));
	if (options.query) {
		let kws = options.query.toLowerCase().split(/\s+/);
		sections = sections.filter((section) => {
			const text = section.innerText.toLowerCase();
			if (!kws.every(kw => text.includes(kw))) {
				section.parentNode.removeChild(section);
				return false;
			}
			return true;
		});
	}

	if (options.files.length) {
		sections = sections.filter((section) => {
			if (!options.files.includes(section.dataset.file)) {
				section.parentNode.removeChild(section);
				return false;
			}
			return true;
		});
	}

	if (options.exported.length) {
		sections = sections.filter((section) => {
			if (!options.exported.includes(section.dataset.exported)) {
				section.parentNode.removeChild(section);
				return false;
			}
			return true;
		});
	}
}


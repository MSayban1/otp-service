function parseTemplate(template, data) {
    if (!template) return '';
    if (!data) return template;

    // Use a regex to find all {{key}} or {{ key }} occurrences
    return template.replace(/{{(.*?)}}/g, (match, key) => {
        const trimmedKey = key.trim().toLowerCase();

        // Find a matching key in the data object (case-insensitive)
        const dataKey = Object.keys(data).find(k => k.toLowerCase() === trimmedKey);

        // Return the value if found, otherwise return the original {{placeholder}}
        return dataKey !== undefined ? data[dataKey] : match;
    });
}

module.exports = { parseTemplate };

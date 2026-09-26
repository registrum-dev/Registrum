export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return bySelection(text);
	}
}

/** A page served over plain HTTP to another device is not a secure context, so
 *  `navigator.clipboard` can be missing. */
function bySelection(text: string): boolean {
	const area = document.createElement("textarea");
	area.value = text;
	area.setAttribute("readonly", "");
	area.style.position = "fixed";
	area.style.top = "0";
	area.style.opacity = "0";
	document.body.append(area);
	area.select();
	const copied = document.execCommand("copy");
	area.remove();
	return copied;
}

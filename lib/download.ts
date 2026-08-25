/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Turn a title into something safe to write to a filesystem. */
export function toFileName(title: string, fallback = 'explainer'): string {
  const cleaned = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `${cleaned || fallback}.html`;
}

export type SaveOutcome = 'saved' | 'copied' | 'failed';

/**
 * Hand the finished document to the user as a file.
 *
 * Telegram's in-app browser blocks downloads on some platforms, so a refusal
 * falls back to the clipboard rather than leaving the user with nothing: the
 * whole point is that the result can leave the app.
 */
export async function saveHtml(
  fileName: string,
  html: string,
): Promise<SaveOutcome> {
  try {
    const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Give the browser a moment to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'saved';
  } catch (error) {
    console.warn('Download refused, falling back to the clipboard:', error);
  }

  try {
    await navigator.clipboard.writeText(html);
    return 'copied';
  } catch (error) {
    console.error('Could not copy the document either:', error);
    return 'failed';
  }
}

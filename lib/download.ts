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

/** What a save attempt can be honestly said to have done. */
export type SaveOutcome = 'attempted' | 'failed';

/** What a copy attempt did, which unlike a download is observable. */
export type CopyOutcome = 'copied' | 'failed';

/**
 * Start a download of the finished document.
 *
 * Returns "attempted", never "saved", because whether the file arrived is not
 * knowable from here. A browser that refuses a download refuses it silently:
 * the click is ignored, nothing throws, and no event fires. Telegram's in-app
 * browser does exactly that on some platforms.
 *
 * This used to claim success and fall back to the clipboard on a thrown
 * error -- but a silent refusal throws nothing, so the fallback could not
 * fire and the button reported "Saved" over a file that was nowhere. Copying
 * is now a button of its own rather than a rescue that never came.
 */
export async function downloadHtml(
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
    return 'attempted';
  } catch (error) {
    console.warn('Could not start the download:', error);
    return 'failed';
  }
}

/** Put the whole document on the clipboard. This one we can actually verify. */
export async function copyHtml(html: string): Promise<CopyOutcome> {
  try {
    await navigator.clipboard.writeText(html);
    return 'copied';
  } catch (error) {
    console.warn('Clipboard refused, trying the legacy path:', error);
  }

  /*
   * execCommand is deprecated but still the only path in some in-app
   * browsers, which expose no async clipboard at all.
   */
  try {
    const field = document.createElement('textarea');
    field.value = html;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    if (ok) return 'copied';
  } catch (error) {
    console.error('Could not copy the document either:', error);
  }

  return 'failed';
}

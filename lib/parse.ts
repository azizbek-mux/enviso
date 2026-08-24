/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Pull a JSON object out of a model response that may carry stray prose. */
export const parseJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}') + 1;
    if (start === -1 || end <= start) {
      throw new Error('The model did not return a usable plan. Try again.');
    }
    return JSON.parse(str.substring(start, end));
  }
};

/**
 * Extract the HTML document from a fenced model response.
 *
 * Tolerates partial input so the same function can render a half-finished
 * stream, and tolerates a missing doctype or a missing closing fence.
 */
export const parseHTML = (str: string): string => {
  let text = str.trim();

  // Drop an opening fence and any language tag that follows it.
  const fence = text.match(/^```[a-zA-Z]*\n?/);
  if (fence) text = text.slice(fence[0].length);

  // Drop the closing fence and anything the model added after it.
  const closing = text.lastIndexOf('```');
  if (closing !== -1) text = text.slice(0, closing);

  // Prefer starting at the document itself if the model wrote a preamble.
  const docStart = text.search(/<!DOCTYPE html>|<html[\s>]/i);
  if (docStart > 0) text = text.slice(docStart);

  return text.trim();
};

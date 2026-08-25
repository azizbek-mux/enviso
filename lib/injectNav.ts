/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Make in-page navigation work inside the preview iframe.
 *
 * The generated page is rendered through `srcdoc`, so its document URL is
 * `about:srcdoc`. A plain <a href="#section"> therefore asks the browser to
 * navigate to `about:srcdoc#section`, and in a sandboxed frame with no
 * same-origin access that discards the document and leaves a blank pane --
 * which is exactly what pressing the header did.
 *
 * Intercepting the click and scrolling programmatically avoids navigation
 * altogether. Injected rather than only prompted for, so pages generated
 * before this fix behave too, and harmless in a saved file opened directly.
 */
const NAV_FIX = `
<script>
(function () {
  if (window.__navFixInstalled) return;
  window.__navFixInstalled = true;

  function headerOffset() {
    var header = document.querySelector('header, .site-header, .sticky-header');
    if (!header) return 24;
    var style = getComputedStyle(header);
    var fixed = style.position === 'fixed' || style.position === 'sticky';
    return fixed ? header.getBoundingClientRect().height + 16 : 24;
  }

  // Options, placeholders, titles and aria labels are not covered by a
  // textContent swap, so a select could sit in Uzbek while English was
  // chosen. Extend whatever the page already installed rather than replacing
  // it, so both handlers agree.
  var original = window.applyLanguage;
  window.applyLanguage = function (lang) {
    if (typeof original === 'function') original(lang);

    document.querySelectorAll('option[data-uz][data-en]').forEach(function (el) {
      var next = el.getAttribute('data-' + lang);
      if (next !== null) el.textContent = next;
    });
    ['placeholder', 'title', 'aria-label', 'value'].forEach(function (attr) {
      var key = 'data-' + attr + '-';
      document.querySelectorAll('[' + key + 'uz][' + key + 'en]').forEach(
        function (el) {
          var next = el.getAttribute(key + lang);
          if (next !== null) el.setAttribute(attr, next);
        },
      );
    });
    window.__lang = lang;
  };

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest
      ? event.target.closest('a[href^="#"]')
      : null;
    if (!link) return;

    var href = link.getAttribute('href') || '';
    event.preventDefault();

    if (href === '#' || href === '#top') {
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }

    var target = document.getElementById(href.slice(1));
    if (!target) return;

    var top =
      target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({top: top, behavior: 'smooth'});
  });
})();
</script>
`;

/** Add the navigation fix to a generated document. */
export function withWorkingNav(html: string): string {
  if (!html || html.includes('__navFixInstalled')) return html;

  return html.includes('</body>')
    ? html.replace('</body>', `${NAV_FIX}</body>`)
    : html + NAV_FIX;
}

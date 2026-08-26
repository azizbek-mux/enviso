/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Repairs applied to every generated page as it is rendered.
 *
 * Two things generated pages get wrong often enough to be worth fixing at the
 * door rather than only in the brief: in-page links that blank the frame, and
 * rows of controls that overflow a phone screen. Injected rather than only
 * prompted for, so pages generated before the rules existed behave too.
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

  /*
   * Rescue rows that overflow sideways.
   *
   * A strip of labelled steps is the usual casualty on a 360px screen: the
   * labels collide or get cut mid-word, and the ones past the edge cannot be
   * reached at all. Any flex or grid row whose content is wider than itself is
   * already broken, so making it scrollable can only improve it.
   */
  function rescueOverflow() {
    var nodes = document.querySelectorAll('div, nav, ul, ol, header, section');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.clientWidth) continue;
      if (el.scrollWidth <= el.clientWidth + 2) continue;

      var cs = getComputedStyle(el);
      var laidOutInARow =
        (cs.display === 'flex' || cs.display === 'inline-flex') &&
        cs.flexDirection.indexOf('row') === 0;
      if (!laidOutInARow && cs.display !== 'grid') continue;
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;

      el.style.overflowX = 'auto';
      el.style.flexWrap = 'nowrap';
      el.style.scrollbarWidth = 'none';
      for (var c = 0; c < el.children.length; c++) {
        el.children[c].style.flex = '0 0 auto';
        el.children[c].style.whiteSpace = 'nowrap';
      }
    }
  }

  var pending;
  function scheduleRescue() {
    clearTimeout(pending);
    pending = setTimeout(rescueOverflow, 120);
  }

  if (document.readyState === 'complete') scheduleRescue();
  else window.addEventListener('load', scheduleRescue);
  window.addEventListener('resize', scheduleRescue);
  // Sections often build their controls after first paint.
  new MutationObserver(scheduleRescue).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

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

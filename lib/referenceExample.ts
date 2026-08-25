/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A worked example, translated from the reference build.
 *
 * Describing a design in prose was never going to reproduce it. This is the
 * actual structure of a section from an AI Studio explainer -- its eyebrow,
 * ranked cards, filter chips, SVG plot with a threshold line, and detail
 * panel -- rewritten in the idiom this runtime uses: Tailwind classes, inline
 * SVG, and plain JavaScript instead of React.
 *
 * The class vocabulary is theirs verbatim, because that vocabulary is the
 * house style: stone greys, rounded-2xl cards, hairline borders, uppercase
 * tracking-wider eyebrows, mono for figures.
 */
export const REFERENCE_SECTION = String.raw`<section id="phewas" class="py-20 border-t border-stone-200">
  <div class="max-w-7xl mx-auto px-6 space-y-8">

    <!-- Eyebrow: names the instrument and its figure number -->
    <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
      <span data-uz="FENOM BO‘YICHA ASSOTSIATSIYA • 1-RASM"
            data-en="PHENOME-WIDE ASSOCIATION STUDY • FIGURE 1">PHENOME-WIDE ASSOCIATION STUDY • FIGURE 1</span>
    </div>

    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <h2 class="font-serif text-3xl md:text-5xl text-stone-900 leading-tight"
          data-uz="30-SNP homiladorlik yo‘qotilishi PGS PheWAS (N = 459,009)"
          data-en="30-SNP Pregnancy Loss PGS PheWAS (N = 459,009)">30-SNP Pregnancy Loss PGS PheWAS (N = 459,009)</h2>

      <!-- Callout: a threshold, a caveat or a definition -->
      <div class="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-900">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             class="mt-0.5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span class="text-sm font-semibold">Bonferroni Threshold: P &lt; 1.79 × 10<sup>−4</sup> (0.05 / 280)</span>
      </div>
    </div>

    <!-- Ranked cards, tinted by meaning, not decoration -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <span class="bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            TOP #1 ASSOCIATION • ICD-10 K449</span>
          <span class="font-mono text-xs font-bold text-stone-700">50,001 Cases</span>
        </div>
        <h3 class="font-serif text-2xl text-stone-900 mb-2">Diaphragmatic Hernia</h3>
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="font-serif text-2xl text-rose-800">OR 1.02</span>
          <span class="font-mono text-xs text-stone-500">[1.01 – 1.03]</span>
          <span class="ml-auto font-mono text-xs font-bold text-rose-700">P = 9.15 × 10<sup>−7</sup></span>
        </div>
        <p class="text-[11px] text-stone-600 mt-2 leading-relaxed">
          Shared embryonic midline developmental defects and placental hypoxic stress.</p>
      </div>
      <!-- two further cards, same shape, neutral tints -->
    </div>

    <!-- Filter chips drive the plot below -->
    <div class="flex flex-wrap items-center gap-2 pt-2">
      <span class="text-xs font-bold uppercase tracking-wider text-stone-500 mr-2"
            data-uz="TOIFA:" data-en="CATEGORY:">CATEGORY:</span>
      <button data-cat="ALL" class="cat-chip px-3 py-1 rounded-lg text-xs font-semibold bg-stone-900 text-white">ALL</button>
      <button data-cat="Digestive" class="cat-chip px-3 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-600">Digestive</button>
      <button data-cat="Respiratory" class="cat-chip px-3 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-600">Respiratory</button>
    </div>

    <!-- Plot on the left, detail panel on the right -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div class="lg:col-span-7 bg-[#FAF9F5] p-5 rounded-2xl border border-stone-200 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-stone-700">
            Interactive PheWAS Manhattan Plot (−log<sub>10</sub> P vs. ICD-10 Phenotypes)</span>
          <span class="text-[11px] font-mono text-stone-500">Bonferroni Line (−log<sub>10</sub> P = 3.75)</span>
        </div>
        <div class="relative w-full bg-white rounded-xl p-4 border border-stone-300">
          <svg viewBox="0 0 500 320" class="w-full h-auto" id="phewas-plot"></svg>
        </div>
      </div>
      <aside class="lg:col-span-5 space-y-4" id="phewas-detail"></aside>
    </div>
  </div>

  <script>
  (function () {
    // Every value comes from the facts; nothing is typed into the markup.
    var OUTCOMES = [
      {icd10:'K449', name:'Diaphragmatic hernia', category:'Digestive', logP:6.04, or:1.02, cases:50001},
      {icd10:'K20',  name:'Eosinophilic esophagitis', category:'Digestive', logP:5.84, or:1.05, cases:12275},
      {icd10:'J459', name:'Asthma with exacerbation', category:'Respiratory', logP:4.77, or:1.02, cases:41495}
    ];
    var THRESHOLD = 3.75, filter = 'ALL', selected = OUTCOMES[0];

    var plot = document.getElementById('phewas-plot');
    var detail = document.getElementById('phewas-detail');
    var ns = 'http://www.w3.org/2000/svg';

    function el(name, attrs, text) {
      var node = document.createElementNS(ns, name);
      for (var k in attrs) node.setAttribute(k, attrs[k]);
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function draw() {
      plot.textContent = '';
      var rows = filter === 'ALL' ? OUTCOMES : OUTCOMES.filter(function (o) { return o.category === filter; });

      // Gridlines and y-axis, positioned by arithmetic rather than a library.
      for (var lvl = 0; lvl <= 6; lvl++) {
        var y = 270 - (lvl / 6.5) * 230;
        plot.appendChild(el('line', {x1:45, y1:y, x2:480, y2:y, stroke:'#f1f5f9', 'stroke-dasharray':'2 2'}));
        plot.appendChild(el('text', {x:25, y:y + 3, 'font-size':10, fill:'#94a3b8'}, String(lvl)));
      }

      var ty = 270 - (THRESHOLD / 6.5) * 230;
      plot.appendChild(el('line', {x1:45, y1:ty, x2:480, y2:ty, stroke:'#be123c', 'stroke-dasharray':'5 3'}));
      plot.appendChild(el('text', {x:400, y:ty - 6, 'font-size':9, fill:'#be123c'}, 'Bonferroni'));

      rows.forEach(function (o, idx) {
        var x = 60 + (idx / Math.max(1, rows.length - 1)) * 400;
        var y = 270 - (o.logP / 6.5) * 230;
        var dot = el('circle', {
          cx:x, cy:y, r: o === selected ? 8 : 5,
          fill: o.logP >= THRESHOLD ? '#be123c' : '#a8a29e',
          style:'cursor:pointer;transition:r .15s'
        });
        dot.addEventListener('click', function () { selected = o; draw(); });
        plot.appendChild(dot);
      });

      var lang = window.__lang || 'uz';
      detail.innerHTML =
        '<div class="bg-white border border-stone-200 rounded-2xl p-5">' +
          '<span class="text-[10px] font-bold uppercase tracking-wider text-stone-500">' + selected.category + '</span>' +
          '<h3 class="font-serif text-2xl text-stone-900 mt-1">' + selected.name + '</h3>' +
          '<p class="font-mono text-sm text-stone-700 mt-2">OR ' + selected.or.toFixed(2) +
            ' · ' + selected.cases.toLocaleString() + ' ' + (lang === 'uz' ? 'holat' : 'cases') + '</p>' +
        '</div>';
    }

    document.querySelectorAll('.cat-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filter = chip.getAttribute('data-cat');
        document.querySelectorAll('.cat-chip').forEach(function (c) {
          var on = c === chip;
          c.className = 'cat-chip px-3 py-1 rounded-lg text-xs font-semibold ' +
            (on ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600');
        });
        draw();
      });
    });

    draw();
  })();
  </script>
</section>`;

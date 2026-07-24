(() => {
  "use strict";

  const DATASET_DIR = "datasets_data/";
  const EXPRESSION_DIR = "expression_data/";
  const NR_KEY_BY_EXPRESSION_ID = {
    Camellia_oleifera: "Cao",
    Castanea_mollissima: "Cm",
    Cunninghamia_lanceolata: "Cula",
    Hippeastrum_sp: "Hip",
    Liquidambar_formosana: "Lf",
    Liriodendron_hybrid: "Lc",
    Picea_abies: "Pa",
    Quercus_suber: "Qs",
    Vitis_vinifera: "Vv",
    Zea_mays: "Zma"
  };
  const COEX_EXAMPLES = {
    Camellia_oleifera: "maker-HiC_scaffold_10-snap-gene-1860.33-mRNA-1",
    Castanea_mollissima: "CmMahoganyH2.02G171900.1.v1.1",
    Cunninghamia_lanceolata: "CULA04G23470",
    Hippeastrum_sp: "TRINITY_DN1000_c0_g1",
    Liquidambar_formosana: "L1049_000001",
    Liriodendron_hybrid: "Lchi09014",
    Picea_abies: "MA_491379g0010",
    Quercus_suber: "XP_023926621.1",
    Vitis_vinifera: "XP_002274796.1",
    Zea_mays: "NP_001130585.1"
  };
  const FAMILY_PATTERNS = {
    "PsbO/OEE1": "\\bPsbO\\b|oxygen[- ]evolving enhancer protein 1|photosystem II[^;]*oxygen-evolving",
    "WOX/WUS": "\\bWOX\\d*\\b|WUSCHEL|WUS-related homeobox",
    "SERK": "somatic embryogenesis receptor(?:-like)? kinase|\\bSERK\\d*\\b",
    "BBM/AP2": "BABY BOOM|\\bBBM\\b|AP2-like ethylene-responsive transcription factor|AP2/ERF",
    "LEC/LAFL": "LEAFY COTYLEDON|\\bLEC[12]?\\b|\\bFUSCA3\\b|\\bABI3\\b",
    "ARF/Aux-IAA": "auxin response factor|auxin-responsive protein IAA|Aux/IAA",
    "PIN": "PIN[- ]FORMED|auxin efflux carrier component",
    "YUCCA": "\\bYUCCA\\b|flavin-containing monooxygenase[^;]*YUCCA",
    "NAC": "NAC domain-containing|NAC transcription factor",
    "MYB": "MYB(?:-related|-like)? transcription factor|transcription factor MYB|MYB family",
    "bHLH": "basic helix-loop-helix|bHLH transcription factor",
    "WRKY": "WRKY transcription factor|WRKY DNA-binding",
    "bZIP": "bZIP transcription factor|basic leucine zipper",
    "MADS-box": "MADS-box|MADS domain"
  };

  const byId = (id) => document.getElementById(id);
  const escapeHtmlLocal = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const cleanField = (value) => String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const finite = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const truthyCell = (value) => /^(true|1|yes)$/i.test(String(value || "").trim());

  function setModuleStatus(id, message, kind = "") {
    const node = byId(id);
    if (!node) return;
    node.textContent = message;
    node.classList.remove("busy", "error");
    if (kind) node.classList.add(kind);
  }

  async function responseToGzipText(response) {
    if (!response.ok) throw new Error(`Request failed (${response.status}): ${response.url}`);
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser does not support gzip decompression. Use a current Chrome, Edge or Firefox.");
    }
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }

  async function fetchGzipText(url) {
    const response = await fetch(url);
    if ("DecompressionStream" in window) return await responseToGzipText(response);
    const fallbackUrl = url.replace(/\.gz$/i, "");
    const fallback = await fetch(fallbackUrl);
    if (fallback.ok) return await fallback.text();
    throw new Error("This browser cannot decompress gzip data and no uncompressed fallback is available for the selected dataset. Use a current Chrome, Edge or Firefox.");
  }

  async function fetchGzipJson(url) {
    return JSON.parse(await fetchGzipText(url));
  }

  function rowsToTsv(rows, columns) {
    return [
      columns.map((column) => column.label).join("\t"),
      ...rows.map((row) => columns.map((column) => cleanField(
        typeof column.value === "function" ? column.value(row) : row[column.key]
      )).join("\t"))
    ].join("\n");
  }

  function parseTsvObjects(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines.shift().split("\t");
    return lines.map((line) => {
      const values = line.split("\t");
      return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
    });
  }

  function openSupplementalFigure(link) {
    const index = DB.figures.findIndex((figure) => figure.link === link);
    if (index >= 0) openFigure(index);
  }

  document.querySelectorAll("[data-extra-figure]").forEach((image) => {
    image.addEventListener("click", () => openSupplementalFigure(image.getAttribute("src")));
    image.setAttribute("title", "Open full-size figure");
  });

  /* ---------- Coexpression network query ---------- */
  const coexpressionState = {
    index: null,
    result: [],
    query: "",
    species: "",
    samples: [],
    annotationCache: new Map()
  };

  async function loadExpressionIndex() {
    if (!coexpressionState.index) {
      const response = await fetch(EXPRESSION_DIR + "index.json");
      if (!response.ok) throw new Error(`Expression index could not be loaded (${response.status}).`);
      coexpressionState.index = await response.json();
    }
    return coexpressionState.index;
  }

  async function loadAnnotationMap(expressionId) {
    if (coexpressionState.annotationCache.has(expressionId)) {
      return coexpressionState.annotationCache.get(expressionId);
    }
    const key = NR_KEY_BY_EXPRESSION_ID[expressionId];
    if (!key) throw new Error("No NR annotation mapping is available for this species.");
    const data = await fetchGzipJson(`${DATASET_DIR}nr_${key}.json.gz`);
    const map = new Map();
    for (const row of data.rows || []) map.set(String(row.q || "").toUpperCase(), row);
    coexpressionState.annotationCache.set(expressionId, map);
    return map;
  }

  function isClearAnnotation(description) {
    const text = String(description || "").trim();
    if (!text) return false;
    return !/(uncharacterized protein|hypothetical protein|unknown function|unnamed protein product)/i.test(text);
  }

  function forEachMatrixLine(text, callback) {
    let start = text.indexOf("\n") + 1;
    if (start <= 0) return;
    while (start < text.length) {
      let end = text.indexOf("\n", start);
      if (end < 0) end = text.length;
      const line = text.slice(start, end).replace(/\r$/, "");
      if (line) callback(line);
      start = end + 1;
    }
  }

  function parseMatrixLine(line) {
    const cells = line.split("\t");
    return {
      id: String(cells.shift() || "").trim(),
      values: cells.map((value) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
      })
    };
  }

  function pearson(left, right) {
    const n = Math.min(left.length, right.length);
    if (n < 3) return null;
    let sumLeft = 0, sumRight = 0;
    for (let i = 0; i < n; i++) {
      sumLeft += left[i];
      sumRight += right[i];
    }
    const meanLeft = sumLeft / n;
    const meanRight = sumRight / n;
    let numerator = 0, denominatorLeft = 0, denominatorRight = 0;
    for (let i = 0; i < n; i++) {
      const a = left[i] - meanLeft;
      const b = right[i] - meanRight;
      numerator += a * b;
      denominatorLeft += a * a;
      denominatorRight += b * b;
    }
    const denominator = Math.sqrt(denominatorLeft * denominatorRight);
    return denominator ? numerator / denominator : null;
  }

  function renderCoexpressionNetwork(query, rows, threshold) {
    const svg = byId("coexSvg");
    const width = 900, height = 520, centerX = 450, centerY = 260;
    if (!rows.length) {
      svg.innerHTML = `<text x="450" y="260" text-anchor="middle" fill="#667085" font-size="15">No annotated relationship passed |r| ≥ ${threshold.toFixed(2)}</text>`;
      return;
    }
    const radiusX = rows.length > 28 ? 340 : 305;
    const radiusY = rows.length > 28 ? 205 : 188;
    const positioned = rows.map((row, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index / rows.length);
      return {...row, x:centerX + Math.cos(angle) * radiusX, y:centerY + Math.sin(angle) * radiusY};
    });
    const edgeMarkup = positioned.map((row) => {
      const positive = row.r >= 0;
      const color = positive ? "#168a68" : "#be3455";
      const widthValue = 1.2 + Math.max(0, (Math.abs(row.r) - threshold) / Math.max(0.01, 1 - threshold)) * 3.2;
      return `<line x1="${centerX}" y1="${centerY}" x2="${row.x.toFixed(1)}" y2="${row.y.toFixed(1)}" stroke="${color}" stroke-width="${widthValue.toFixed(2)}" stroke-opacity=".55"${positive ? "" : ' stroke-dasharray="6 5"'} />`;
    }).join("");
    const showLabels = rows.length <= 34;
    const nodeMarkup = positioned.map((row, index) => {
      const positive = row.r >= 0;
      const fill = positive ? "#168a68" : "#be3455";
      const anchor = row.x < centerX - 20 ? "end" : (row.x > centerX + 20 ? "start" : "middle");
      const labelX = row.x + (anchor === "start" ? 11 : anchor === "end" ? -11 : 0);
      const labelY = row.y + (anchor === "middle" ? (row.y < centerY ? -12 : 19) : 4);
      const shortId = row.id.length > 22 ? row.id.slice(0, 19) + "…" : row.id;
      return `<g class="coex-node" data-coex-index="${index}" role="button" tabindex="0" aria-label="${escapeHtmlLocal(row.id)} correlation ${row.r.toFixed(4)}">
        <circle cx="${row.x.toFixed(1)}" cy="${row.y.toFixed(1)}" r="${(7 + Math.abs(row.r) * 4).toFixed(1)}" fill="${fill}" stroke="#fff" stroke-width="2.5"/>
        ${showLabels ? `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" fill="#344054" font-size="10.5" font-weight="700">${escapeHtmlLocal(shortId)}</text>` : ""}
        <title>${escapeHtmlLocal(row.id)} · r=${row.r.toFixed(4)} · ${escapeHtmlLocal(row.description)}</title>
      </g>`;
    }).join("");
    const queryShort = query.length > 26 ? query.slice(0, 23) + "…" : query;
    svg.innerHTML = `${edgeMarkup}${nodeMarkup}
      <circle cx="${centerX}" cy="${centerY}" r="34" fill="#2563eb" stroke="#fff" stroke-width="5"/>
      <circle cx="${centerX}" cy="${centerY}" r="39" fill="none" stroke="#2563eb" stroke-opacity=".22" stroke-width="7"/>
      <text x="${centerX}" y="${centerY - 4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="800">QUERY</text>
      <text x="${centerX}" y="${centerY + 13}" text-anchor="middle" fill="#fff" font-size="10">${escapeHtmlLocal(queryShort)}</text>`;
    svg.querySelectorAll("[data-coex-index]").forEach((node) => {
      const inspect = () => {
        const row = rows[Number(node.getAttribute("data-coex-index"))];
        byId("coexDetails").innerHTML = `<strong>${escapeHtmlLocal(row.id)}</strong> · <span class="xse-badge ${row.r >= 0 ? "pos" : "neg"}">${row.r >= 0 ? "positive" : "negative"} r=${row.r.toFixed(4)}</span><br>${escapeHtmlLocal(row.description)}<br><span style="color:#667085">NR hit ${escapeHtmlLocal(row.subject)} · identity ${escapeHtmlLocal(row.identity)}% · coverage ${escapeHtmlLocal(row.coverage)}%</span>`;
      };
      node.addEventListener("click", inspect);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inspect();
        }
      });
    });
  }

  function renderCoexpressionTable(rows) {
    const wrap = byId("coexTableWrap");
    if (!rows.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "block";
    wrap.innerHTML = `<table><thead><tr><th>Candidate gene</th><th>Pearson r</th><th>Direction</th><th>NR hit</th><th>Identity</th><th>Coverage</th><th>Description</th></tr></thead><tbody>${rows.map((row) =>
      `<tr><td><strong>${escapeHtmlLocal(row.id)}</strong></td><td>${row.r.toFixed(4)}</td><td><span class="xse-badge ${row.r >= 0 ? "pos" : "neg"}">${row.r >= 0 ? "positive" : "negative"}</span></td><td>${escapeHtmlLocal(row.subject)}</td><td>${escapeHtmlLocal(row.identity)}%</td><td>${escapeHtmlLocal(row.coverage)}%</td><td class="desc">${escapeHtmlLocal(row.description)}</td></tr>`
    ).join("")}</tbody></table>`;
  }

  async function runCoexpressionQuery() {
    const expressionId = byId("coexSpecies").value;
    const query = byId("coexGene").value.trim();
    const threshold = Math.max(0.8, Math.min(0.99, Number(byId("coexThreshold").value) || 0.9));
    const limit = Math.max(3, Math.min(100, Number(byId("coexLimit").value) || 12));
    if (!expressionId || !query) {
      setModuleStatus("coexStatus", "Select a species and enter an exact query gene ID.", "error");
      return;
    }
    byId("coexRun").disabled = true;
    byId("coexExport").disabled = true;
    setModuleStatus("coexStatus", "Loading the full FPKM matrix and NR annotations...", "busy");
    try {
      const index = await loadExpressionIndex();
      const species = index.species.find((entry) => entry.id === expressionId);
      if (!species || !species.metrics || !species.metrics.fpkm) throw new Error("No FPKM matrix is indexed for this species.");
      const [matrixText, annotationMap] = await Promise.all([
        fetchGzipText(EXPRESSION_DIR + species.metrics.fpkm.file),
        loadAnnotationMap(expressionId)
      ]);
      let queryRecord = null;
      const suggestions = [];
      const queryUpper = query.toUpperCase();
      forEachMatrixLine(matrixText, (line) => {
        if (queryRecord) return;
        const tab = line.indexOf("\t");
        const id = (tab >= 0 ? line.slice(0, tab) : line).trim();
        const upper = id.toUpperCase();
        if (upper === queryUpper) queryRecord = parseMatrixLine(line);
        else if (suggestions.length < 8 && upper.includes(queryUpper)) suggestions.push(id);
      });
      if (!queryRecord) {
        const suffix = suggestions.length ? ` Similar IDs: ${suggestions.join(", ")}.` : "";
        throw new Error(`Gene “${query}” was not found in the selected FPKM matrix.${suffix}`);
      }
      if (queryRecord.values.every((value) => value < 1)) {
        throw new Error("The query gene has FPKM < 1 in every sample and is excluded by the manuscript low-expression rule.");
      }
      const retained = [];
      let strongAnnotatedCount = 0;
      const trimTarget = Math.max(1000, limit * 40);
      forEachMatrixLine(matrixText, (line) => {
        const tab = line.indexOf("\t");
        if (tab < 1) return;
        const id = line.slice(0, tab).trim();
        if (id.toUpperCase() === queryUpper) return;
        const annotation = annotationMap.get(id.toUpperCase());
        if (!annotation || !isClearAnnotation(annotation.t)) return;
        const record = parseMatrixLine(line);
        if (!record.values.length || record.values.every((value) => value < 1)) return;
        const r = pearson(queryRecord.values, record.values);
        if (r === null || Math.abs(r) < threshold) return;
        strongAnnotatedCount++;
        retained.push({
          id,
          r,
          subject: annotation.s || "",
          identity: annotation.pid || "",
          coverage: annotation.cov || "",
          evalue: annotation.ev || "",
          description: annotation.t || ""
        });
        if (retained.length > trimTarget * 2) {
          retained.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
          retained.length = trimTarget;
        }
      });
      retained.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      const shown = retained.slice(0, limit);
      coexpressionState.result = shown;
      coexpressionState.query = queryRecord.id;
      coexpressionState.species = species.label;
      coexpressionState.samples = species.metrics.fpkm.samples || [];
      renderCoexpressionNetwork(queryRecord.id, shown, threshold);
      renderCoexpressionTable(shown);
      byId("coexExport").disabled = !shown.length;
      const positive = shown.filter((row) => row.r >= 0).length;
      const negative = shown.length - positive;
      setModuleStatus("coexStatus", `${species.label}: ${strongAnnotatedCount.toLocaleString()} annotated relationships passed |r| ≥ ${threshold.toFixed(2)} across ${queryRecord.values.length} samples; showing the top ${shown.length} (${positive} positive, ${negative} negative).`);
    } catch (error) {
      coexpressionState.result = [];
      renderCoexpressionTable([]);
      renderCoexpressionNetwork(query, [], threshold);
      setModuleStatus("coexStatus", error.message || String(error), "error");
    } finally {
      byId("coexRun").disabled = false;
    }
  }

  async function initCoexpressionModule() {
    try {
      const index = await loadExpressionIndex();
      byId("coexSpecies").innerHTML = index.species.map((entry) =>
        `<option value="${escapeHtmlLocal(entry.id)}"${entry.id === "Liriodendron_hybrid" ? " selected" : ""}>${escapeHtmlLocal(entry.label)}</option>`
      ).join("");
    } catch (error) {
      setModuleStatus("coexStatus", error.message || String(error), "error");
    }
    byId("coexThreshold").addEventListener("input", () => {
      byId("coexThresholdValue").textContent = Number(byId("coexThreshold").value).toFixed(2);
    });
    byId("coexSpecies").addEventListener("change", () => {
      const example = COEX_EXAMPLES[byId("coexSpecies").value];
      if (example) byId("coexGene").value = example;
    });
    byId("coexRun").addEventListener("click", runCoexpressionQuery);
    byId("coexGene").addEventListener("keydown", (event) => {
      if (event.key === "Enter") runCoexpressionQuery();
    });
    byId("coexExample").addEventListener("click", () => {
      byId("coexSpecies").value = "Liriodendron_hybrid";
      byId("coexGene").value = "Lchi09014";
      byId("coexThreshold").value = "0.90";
      byId("coexThresholdValue").textContent = "0.90";
      byId("coexLimit").value = "12";
      setModuleStatus("coexStatus", "Liriodendron hybrid example loaded. Select “Build network” to calculate the live result.");
    });
    byId("coexExport").addEventListener("click", () => {
      if (!coexpressionState.result.length) return;
      const columns = [
        {label:"species", value:() => coexpressionState.species},
        {label:"query_gene", value:() => coexpressionState.query},
        {label:"candidate_gene", key:"id"},
        {label:"pearson_r", value:(row) => row.r.toFixed(6)},
        {label:"direction", value:(row) => row.r >= 0 ? "positive" : "negative"},
        {label:"nr_subject", key:"subject"},
        {label:"identity_percent", key:"identity"},
        {label:"coverage_percent", key:"coverage"},
        {label:"evalue", key:"evalue"},
        {label:"description", key:"description"}
      ];
      downloadText(`coexpression_${coexpressionState.query}.tsv`, rowsToTsv(coexpressionState.result, columns));
    });
  }

  /* ---------- Developmental stage-specificity (tau) ---------- */
  const tauState = {cache:new Map(), catalogue:null, view:[], abbr:""};

  function classifyTau(values) {
    const cleaned = values.map((value) => Math.max(0, finite(value)));
    const maxValue = cleaned.length ? Math.max(...cleaned) : 0;
    let tau = 0;
    if (maxValue > 0 && cleaned.length > 1) {
      tau = cleaned.reduce((sum, value) => sum + (1 - value / maxValue), 0) / (cleaned.length - 1);
      tau = Math.max(0, Math.min(1, tau));
    }
    let category;
    if (cleaned.every((value) => value < 1)) category = "not-expressed";
    else if (cleaned.every((value) => value < 10)) category = "weakly-expressed";
    else if (tau < 0.87) category = "broadly-expressed";
    else category = "stage-specific";
    return {tau, maxValue, category, values:cleaned};
  }

  async function buildTauCatalogue(abbr) {
    if (tauState.cache.has(abbr)) return await tauState.cache.get(abbr);
    const promise = (async () => {
      if (abbr === "Lc") {
        const response = await fetch(DATASET_DIR + "stage_specificity/Lc_stage_tau.tsv");
        if (!response.ok) throw new Error(`Liriodendron τ table could not be loaded (${response.status}).`);
        const text = (await response.text()).replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift().split("\t");
        const tauIndex = header.indexOf("TAU");
        const stages = header.slice(1, tauIndex);
        const rows = lines.map((line) => {
          const cells = line.split("\t");
          const values = cells.slice(1, tauIndex).map(finite);
          const result = classifyTau(values);
          const peakIndex = result.values.indexOf(result.maxValue);
          return {
            gene: cells[0] || "",
            tau: result.tau,
            category: result.category,
            peak: stages[peakIndex] || cells[tauIndex + 1] || "",
            max: result.maxValue,
            trend: "",
            annotation: "",
            values: result.values
          };
        });
        return {
          rows,
          stages,
          dataset:{label:"Liriodendron hybrid validated 11-stage FPKM means (TAU result table)", file:"Lc_stage_tau.tsv"},
          species:"Liriodendron chinense / hybrid"
        };
      }
      const chunk = await loadGeneChunk(abbr);
      if (!chunk) throw new Error(`No stage-expression index is available for ${abbr}.`);
      const datasets = Object.entries(chunk.datasets || {}).sort((left, right) => {
        const leftFpkm = String(left[1].data_type || "").toLowerCase() === "fpkm" ? 1 : 0;
        const rightFpkm = String(right[1].data_type || "").toLowerCase() === "fpkm" ? 1 : 0;
        return rightFpkm - leftFpkm || (right[1].stages || []).length - (left[1].stages || []).length;
      });
      if (!datasets.length) throw new Error("No stage-level dataset was found in this species index.");
      const [datasetId, dataset] = datasets[0];
      const stages = dataset.stages || [];
      const rows = [];
      for (const record of chunk.records || []) {
        if (record[1] !== datasetId) continue;
        const values = (record[2] || []).slice(0, stages.length);
        if (values.length < 2) continue;
        const result = classifyTau(values);
        const peakIndex = result.values.indexOf(result.maxValue);
        rows.push({
          gene: String(record[0] || ""),
          tau: result.tau,
          category: result.category,
          peak: stages[peakIndex] || record[4] || "",
          max: result.maxValue,
          trend: record[3] || "",
          annotation: record[7] || "",
          values: result.values
        });
      }
      return {rows, stages, dataset, species:chunk.species_cn || abbr};
    })();
    tauState.cache.set(abbr, promise);
    return await promise;
  }

  function tauClassLabel(category) {
    return {
      "not-expressed":"Not expressed",
      "weakly-expressed":"Weakly expressed",
      "broadly-expressed":"Broadly expressed",
      "stage-specific":"Stage-specific"
    }[category] || category;
  }

  function tauBadgeClass(category) {
    return {
      "not-expressed":"neg",
      "weakly-expressed":"info",
      "broadly-expressed":"warn",
      "stage-specific":"pos"
    }[category] || "info";
  }

  function renderTauResults() {
    if (!tauState.catalogue) return;
    const selectedClass = byId("tauClass").value;
    const selectedPeak = byId("tauPeak").value;
    const geneFilter = byId("tauGene").value.trim().toUpperCase();
    const minimum = Math.max(0, Math.min(1, Number(byId("tauMin").value) || 0));
    const maximumInput = Number(byId("tauMax").value);
    const maximum = Math.max(minimum, Math.min(1, Number.isFinite(maximumInput) ? maximumInput : 1));
    const full = tauState.catalogue.rows;
    const counts = {"not-expressed":0,"weakly-expressed":0,"broadly-expressed":0,"stage-specific":0};
    full.forEach((row) => counts[row.category]++);
    byId("tauSummary").innerHTML = ["not-expressed","weakly-expressed","broadly-expressed","stage-specific"].map((category) =>
      `<div class="xse-class-chip"><b>${counts[category].toLocaleString()}</b><span>${tauClassLabel(category)}</span></div>`
    ).join("");
    tauState.view = full.filter((row) =>
      (selectedClass === "all" || row.category === selectedClass) &&
      (!selectedPeak || row.peak === selectedPeak) &&
      (!geneFilter || row.gene.toUpperCase().includes(geneFilter)) &&
      row.tau >= minimum && row.tau <= maximum
    ).sort((left, right) => right.tau - left.tau || right.max - left.max);
    const shown = tauState.view.slice(0, 200);
    byId("tauTableWrap").innerHTML = shown.length ? `<table><thead><tr><th>Gene ID</th><th>τ</th><th>Class</th><th>Peak stage</th><th>Maximum FPKM</th><th>Trend</th><th>Annotation</th></tr></thead><tbody>${shown.map((row) =>
      `<tr><td><strong>${escapeHtmlLocal(row.gene)}</strong></td><td>${row.tau.toFixed(4)}</td><td><span class="xse-badge ${tauBadgeClass(row.category)}">${tauClassLabel(row.category)}</span></td><td>${escapeHtmlLocal(row.peak)}</td><td>${row.max.toFixed(4)}</td><td>${escapeHtmlLocal(row.trend)}</td><td class="desc">${escapeHtmlLocal(row.annotation || "—")}</td></tr>`
    ).join("")}</tbody></table>` : `<div class="empty-note">No genes match the current τ filters.</div>`;
    byId("tauExport").disabled = !tauState.view.length;
    const datasetName = tauState.catalogue.dataset.label || tauState.catalogue.dataset.file || "stage-level FPKM dataset";
    setModuleStatus("tauStatus", `${tauState.catalogue.species}: ${full.length.toLocaleString()} genes classified from ${tauState.catalogue.stages.length} stages in ${datasetName}; ${tauState.view.length.toLocaleString()} match the current filters${tauState.view.length > 200 ? " (top 200 shown)" : ""}.`);
  }

  async function runTauQuery() {
    const abbr = byId("tauSpecies").value;
    if (!abbr) return;
    byId("tauRun").disabled = true;
    byId("tauExport").disabled = true;
    setModuleStatus("tauStatus", "Loading the embedded stage-expression index and calculating τ...", "busy");
    try {
      tauState.catalogue = await buildTauCatalogue(abbr);
      tauState.abbr = abbr;
      byId("tauPeak").innerHTML = `<option value="">All stages</option>` + tauState.catalogue.stages.map((stage) =>
        `<option value="${escapeHtmlLocal(stage)}">${escapeHtmlLocal(stage)}</option>`
      ).join("");
      renderTauResults();
    } catch (error) {
      tauState.catalogue = null;
      setModuleStatus("tauStatus", error.message || String(error), "error");
    } finally {
      byId("tauRun").disabled = false;
    }
  }

  function initTauModule() {
    const preferredOrder = ["Lc","Cm","Lf","CULA","Co","Pa","Qs","Vv","Zm","Hi"];
    byId("tauSpecies").innerHTML = preferredOrder.filter((abbr) => DB.gene_chunks && DB.gene_chunks[abbr]).map((abbr) =>
      `<option value="${abbr}"${abbr === "Lc" ? " selected" : ""}>${escapeHtmlLocal(DB.gene_chunks[abbr].species_cn || abbr)}</option>`
    ).join("");
    byId("tauRun").addEventListener("click", runTauQuery);
    ["tauClass","tauPeak"].forEach((id) => byId(id).addEventListener("change", () => tauState.catalogue && renderTauResults()));
    ["tauGene","tauMin","tauMax"].forEach((id) => byId(id).addEventListener("input", () => tauState.catalogue && renderTauResults()));
    byId("tauSpecies").addEventListener("change", () => {
      tauState.catalogue = null;
      tauState.view = [];
      byId("tauPeak").innerHTML = `<option value="">All stages</option>`;
      byId("tauTableWrap").innerHTML = `<div class="empty-note">Select “Calculate & query” to build this species catalogue.</div>`;
      byId("tauExport").disabled = true;
      setModuleStatus("tauStatus", "Species changed. Calculate its stage-specificity catalogue.");
    });
    byId("tauReset").addEventListener("click", () => {
      byId("tauClass").value = "all";
      byId("tauPeak").value = "";
      byId("tauGene").value = "";
      byId("tauMin").value = "0";
      byId("tauMax").value = "1";
      if (tauState.catalogue) renderTauResults();
    });
    byId("tauExport").addEventListener("click", () => {
      if (!tauState.view.length) return;
      const columns = [
        {label:"gene_id", key:"gene"},
        {label:"tau", value:(row) => row.tau.toFixed(6)},
        {label:"expression_class", value:(row) => tauClassLabel(row.category)},
        {label:"peak_stage", key:"peak"},
        {label:"max_stage_mean_fpkm", value:(row) => row.max.toFixed(6)},
        {label:"trend", key:"trend"},
        {label:"annotation", key:"annotation"}
      ];
      downloadText(`stage_specificity_tau_${tauState.abbr}.tsv`, rowsToTsv(tauState.view, columns));
    });
  }

  /* ---------- Key gene-family query ---------- */
  const familyState = {manifest:null, catalogue:null, rows:[], family:""};

  async function loadNrManifest() {
    if (!familyState.manifest) {
      const response = await fetch(DATASET_DIR + "nr_manifest.json");
      if (!response.ok) throw new Error(`NR manifest could not be loaded (${response.status}).`);
      familyState.manifest = await response.json();
    }
    return familyState.manifest;
  }

  async function loadCuratedFamilyCatalogue() {
    if (!familyState.catalogue) {
      const response = await fetch(DATASET_DIR + "gene_family_catalog.json");
      if (!response.ok) throw new Error(`Curated gene-family catalogue could not be loaded (${response.status}).`);
      familyState.catalogue = await response.json();
    }
    return familyState.catalogue;
  }

  function buildFamilyPattern() {
    const preset = byId("familyPreset").value;
    const custom = byId("familyKeyword").value.trim();
    if (preset === "custom") {
      if (!custom) throw new Error("Enter a custom keyword or regular expression.");
      try {
        return {label:custom, regex:new RegExp(custom, "i")};
      } catch (error) {
        throw new Error(`The custom regular expression is invalid: ${error.message}`);
      }
    }
    return {label:preset, regex:new RegExp(FAMILY_PATTERNS[preset], "i")};
  }

  function renderFamilyResults() {
    const rows = familyState.rows;
    const represented = new Set(rows.map((row) => row.species));
    byId("familySummary").innerHTML = `<div class="xse-kpi"><b>${rows.length.toLocaleString()}</b><span>matched genes</span></div><div class="xse-kpi"><b>${represented.size}</b><span>species represented</span></div><div class="xse-kpi"><b style="font-size:16px">${escapeHtmlLocal(familyState.family)}</b><span>selected family / pattern</span></div>`;
    const shown = rows.slice(0, 500);
    byId("familyTableWrap").innerHTML = shown.length ? `<table><thead><tr><th>Species</th><th>Gene / protein ID</th><th>NR accession</th><th>Identity</th><th>Coverage</th><th>E-value</th><th>Bitscore</th><th>Description</th></tr></thead><tbody>${shown.map((row) =>
      `<tr><td>${escapeHtmlLocal(row.species)}</td><td><strong>${escapeHtmlLocal(row.gene)}</strong></td><td>${row.subject ? `<a class="download" href="https://www.ncbi.nlm.nih.gov/protein/${encodeURIComponent(row.subject)}" target="_blank" rel="noopener">${escapeHtmlLocal(row.subject)}</a>` : "—"}</td><td>${escapeHtmlLocal(row.identity)}%</td><td>${escapeHtmlLocal(row.coverage || "—")}${row.coverage ? "%" : ""}</td><td>${escapeHtmlLocal(row.evalue)}</td><td>${escapeHtmlLocal(row.bitscore)}</td><td class="desc">${escapeHtmlLocal(row.description)}</td></tr>`
    ).join("")}</tbody></table>` : `<div class="empty-note">No NR best-hit description matches this family pattern and ID filter.</div>`;
    byId("familyExport").disabled = !rows.length;
    setModuleStatus("familyStatus", `${rows.length.toLocaleString()} matches for “${familyState.family}” across ${represented.size} species${rows.length > 500 ? " (top 500 shown)" : ""}.`);
  }

  async function runFamilyQuery() {
    byId("familyRun").disabled = true;
    byId("familyExport").disabled = true;
    familyState.rows = [];
    try {
      const manifest = await loadNrManifest();
      const pattern = buildFamilyPattern();
      const preset = byId("familyPreset").value;
      const selected = byId("familySpecies").value;
      const idFilter = byId("familyGene").value.trim().toUpperCase();
      const speciesEntries = selected === "__all__" ? manifest.species : manifest.species.filter((entry) => entry.key === selected);
      if (!speciesEntries.length) throw new Error("Select at least one species.");
      familyState.family = pattern.label;
      if (preset !== "custom") {
        setModuleStatus("familyStatus", "Loading the curated cross-species family catalogue...", "busy");
        const catalogue = await loadCuratedFamilyCatalogue();
        familyState.rows = (catalogue.rows || []).filter((row) =>
          row.families.includes(preset) &&
          (selected === "__all__" || row.speciesKey === selected) &&
          (!idFilter || row.gene.toUpperCase().includes(idFilter) || row.subject.toUpperCase().includes(idFilter))
        );
        familyState.rows.sort((left, right) => left.species.localeCompare(right.species) || finite(right.bitscore) - finite(left.bitscore));
        renderFamilyResults();
        return;
      }
      for (let index = 0; index < speciesEntries.length; index++) {
        const entry = speciesEntries[index];
        setModuleStatus("familyStatus", `Loading ${entry.label} (${index + 1}/${speciesEntries.length})...`, "busy");
        const data = await fetchGzipJson(DATASET_DIR + entry.file);
        for (const row of data.rows || []) {
          const gene = String(row.q || "");
          if (idFilter && !gene.toUpperCase().includes(idFilter) && !String(row.s || "").toUpperCase().includes(idFilter)) continue;
          if (!pattern.regex.test(String(row.t || ""))) continue;
          familyState.rows.push({
            species: entry.label,
            speciesKey: entry.key,
            gene,
            subject: row.s || "",
            identity: row.pid || "",
            coverage: row.cov || "",
            evalue: row.ev || "",
            bitscore: row.bs || "",
            description: row.t || ""
          });
        }
      }
      familyState.rows.sort((left, right) => left.species.localeCompare(right.species) || finite(right.bitscore) - finite(left.bitscore));
      renderFamilyResults();
    } catch (error) {
      byId("familyTableWrap").innerHTML = `<div class="empty-note">${escapeHtmlLocal(error.message || String(error))}</div>`;
      setModuleStatus("familyStatus", error.message || String(error), "error");
    } finally {
      byId("familyRun").disabled = false;
    }
  }

  async function initFamilyModule() {
    try {
      const manifest = await loadNrManifest();
      byId("familySpecies").innerHTML = `<option value="__all__">All 10 species</option>` + manifest.species.map((entry) =>
        `<option value="${escapeHtmlLocal(entry.key)}">${escapeHtmlLocal(entry.label)}</option>`
      ).join("");
    } catch (error) {
      setModuleStatus("familyStatus", error.message || String(error), "error");
    }
    byId("familyPreset").addEventListener("change", () => {
      const custom = byId("familyPreset").value === "custom";
      byId("familyKeyword").disabled = !custom;
      if (!custom) byId("familyKeyword").value = "";
    });
    byId("familyKeyword").disabled = true;
    byId("familyRun").addEventListener("click", runFamilyQuery);
    byId("familyClear").addEventListener("click", () => {
      byId("familySpecies").value = "__all__";
      byId("familyPreset").value = "PsbO/OEE1";
      byId("familyKeyword").value = "";
      byId("familyKeyword").disabled = true;
      byId("familyGene").value = "";
      familyState.rows = [];
      byId("familyExport").disabled = true;
      byId("familyTableWrap").innerHTML = `<div class="empty-note">No gene-family results loaded.</div>`;
      setModuleStatus("familyStatus", "Filters cleared.");
    });
    byId("familyExport").addEventListener("click", () => {
      if (!familyState.rows.length) return;
      const columns = [
        {label:"species", key:"species"},
        {label:"gene_id", key:"gene"},
        {label:"nr_subject", key:"subject"},
        {label:"identity_percent", key:"identity"},
        {label:"coverage_percent", key:"coverage"},
        {label:"evalue", key:"evalue"},
        {label:"bitscore", key:"bitscore"},
        {label:"description", key:"description"}
      ];
      const safeName = familyState.family.replace(/[^A-Za-z0-9_-]+/g, "_");
      downloadText(`gene_family_${safeName}.tsv`, rowsToTsv(familyState.rows, columns));
    });
  }

  /* ---------- PsbO/OEE1 Ka/Ks and microsynteny case ---------- */
  const evolutionState = {all:null, view:[]};

  async function loadEvolutionPairs() {
    if (!evolutionState.all) {
      const response = await fetch(DATASET_DIR + "psbo_oee1/pairwise_kaks.tsv");
      if (!response.ok) throw new Error(`PsbO/OEE1 pair table could not be loaded (${response.status}).`);
      evolutionState.all = parseTsvObjects(await response.text()).filter((row) => row.kaks_status === "ok");
    }
    return evolutionState.all;
  }

  function renderEvolutionPairs() {
    const subset = byId("evoFilter").value;
    const query = byId("evoGene").value.trim().toUpperCase();
    evolutionState.view = evolutionState.all.filter((row) => {
      const inSubset = subset === "all" ||
        (subset === "anchor" && truthyCell(row.is_lchi09014_anchor_pair)) ||
        (subset === "syntenic" && truthyCell(row.is_syntenic)) ||
        (subset === "main" && truthyCell(row.is_main_pair));
      const haystack = `${row.left_species} ${row.left_gene} ${row.right_species} ${row.right_gene}`.toUpperCase();
      return inSubset && (!query || haystack.includes(query));
    }).sort((left, right) => finite(left.kaks) - finite(right.kaks));
    const shown = evolutionState.view.slice(0, 200);
    const wrap = byId("evoTableWrap");
    wrap.style.display = "block";
    wrap.innerHTML = shown.length ? `<table><thead><tr><th>Pair</th><th>Left member</th><th>Right member</th><th>Ka</th><th>Ks</th><th>Ka/Ks</th><th>AA identity</th><th>Synteny</th><th>Block / anchors</th></tr></thead><tbody>${shown.map((row) =>
      `<tr><td>${escapeHtmlLocal(row.pair_id)}</td><td><strong>${escapeHtmlLocal(row.left_gene)}</strong><br><span style="color:#667085">${escapeHtmlLocal(row.left_species)} · ${escapeHtmlLocal(row.left_role)}</span></td><td><strong>${escapeHtmlLocal(row.right_gene)}</strong><br><span style="color:#667085">${escapeHtmlLocal(row.right_species)} · ${escapeHtmlLocal(row.right_role)}</span></td><td>${finite(row.ka).toFixed(4)}</td><td>${finite(row.ks).toFixed(4)}</td><td><span class="xse-badge pos">${finite(row.kaks).toFixed(4)}</span></td><td>${(finite(row.aa_identity) * 100).toFixed(1)}%</td><td>${truthyCell(row.is_syntenic) ? '<span class="xse-badge info">syntenic</span>' : "—"}</td><td>${escapeHtmlLocal(row.collinearity_block_id || "—")} / ${escapeHtmlLocal(row.collinearity_block_size || "—")}</td></tr>`
    ).join("")}</tbody></table>` : `<div class="empty-note">No Ka/Ks pair matches the current subset and text filter.</div>`;
    byId("evoExport").disabled = !evolutionState.view.length;
    const median = evolutionState.view.length ? [...evolutionState.view].map((row) => finite(row.kaks)).sort((a,b) => a-b) : [];
    const middle = median.length ? (median[Math.floor((median.length - 1) / 2)] + median[Math.ceil((median.length - 1) / 2)]) / 2 : null;
    setModuleStatus("evoStatus", `${evolutionState.view.length} valid pairs match the current filters${middle === null ? "" : `; median Ka/Ks = ${middle.toFixed(4)}`}.`);
  }

  function initEvolutionModule() {
    byId("evoRun").addEventListener("click", async () => {
      byId("evoRun").disabled = true;
      setModuleStatus("evoStatus", "Loading the PsbO/OEE1 pairwise Ka/Ks table...", "busy");
      try {
        await loadEvolutionPairs();
        renderEvolutionPairs();
      } catch (error) {
        setModuleStatus("evoStatus", error.message || String(error), "error");
      } finally {
        byId("evoRun").disabled = false;
      }
    });
    byId("evoFilter").addEventListener("change", () => evolutionState.all && renderEvolutionPairs());
    byId("evoGene").addEventListener("input", () => evolutionState.all && renderEvolutionPairs());
    byId("evoExport").addEventListener("click", () => {
      if (!evolutionState.view.length) return;
      const columns = Object.keys(evolutionState.view[0]).map((key) => ({label:key,key}));
      downloadText("PsbO_OEE1_pairwise_KaKs_filtered.tsv", rowsToTsv(evolutionState.view, columns));
    });
  }

  initCoexpressionModule();
  initTauModule();
  initFamilyModule();
  initEvolutionModule();
})();

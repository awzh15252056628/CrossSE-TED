const DB = JSON.parse(document.getElementById('payload').textContent);
DB.figures.push(
  {group:"Publication freeze v2026.07",title:"Figure 1. CrossSE-TED Architecture and Workflow",desc:"Species coverage and the three-layer database architecture.",size:"SVG/PDF + 600-dpi PNG/TIFF",link:"assets/publication_figures/Figure_1.png",file:"assets/publication_figures/Figure_1.png",vector:"assets/publication_figures/Figure_1.svg",pdf:"assets/publication_figures/Figure_1.pdf",tiff:"assets/publication_figures/Figure_1.tif"},
  {group:"Publication freeze v2026.07",title:"Figure 2. Expression Specificity and Core-TF Composition",desc:"Four \u03c4-based expression classes across species and core transcription-factor family composition.",size:"SVG/PDF + 600-dpi PNG/TIFF",link:"assets/publication_figures/Figure_2.png",file:"assets/publication_figures/Figure_2.png",vector:"assets/publication_figures/Figure_2.svg",pdf:"assets/publication_figures/Figure_2.pdf",tiff:"assets/publication_figures/Figure_2.tif"},
  {group:"Publication freeze v2026.07",title:"Figure 3. Liriodendron hybrid Top-1,000 Coexpression Network",desc:"Frozen 15-sample, five-stage network: 167 nodes, 38 TFs, 129 targets and 1,000 retained edges.",size:"SVG/PDF + 600-dpi PNG/TIFF",link:"assets/publication_figures/Figure_3.png",file:"assets/publication_figures/Figure_3.png",vector:"assets/publication_figures/Figure_3.svg",pdf:"assets/publication_figures/Figure_3.pdf",tiff:"assets/publication_figures/Figure_3.tif"},
  {group:"Publication freeze v2026.07",title:"Figure 4. User Workflow and Core Functional Modules",desc:"Search, comparison, candidate-prioritization, and downstream-design workflow in CrossSE-TED.",size:"SVG/PDF + 600-dpi PNG/TIFF",link:"assets/publication_figures/Figure_4.png",file:"assets/publication_figures/Figure_4.png",vector:"assets/publication_figures/Figure_4.svg",pdf:"assets/publication_figures/Figure_4.pdf",tiff:"assets/publication_figures/Figure_4.tif"},
  {group:"Publication freeze v2026.07",title:"Figure 5. Adjacent-Stage Differential Expression",desc:"DESeq2-defined upregulated and downregulated gene counts for representative angiosperm, gymnosperm, and monocot datasets, plus sample coverage.",size:"SVG/PDF + 600-dpi PNG/TIFF",link:"assets/publication_figures/Figure_5.png",file:"assets/publication_figures/Figure_5.png",vector:"assets/publication_figures/Figure_5.svg",pdf:"assets/publication_figures/Figure_5.pdf",tiff:"assets/publication_figures/Figure_5.tif",data:"assets/publication_figures/Figure5_DEG_count_summary.tsv"},
  {group:"Publication freeze v2026.07",title:"Figure 6. PsbO/OEE1 Microsynteny and Ka/Ks",desc:"Cross-species microsynteny and evolutionary-constraint evidence for the PsbO/OEE1 candidate family.",size:"SVG/PDF + 600-dpi PNG/TIFF",link:"assets/publication_figures/Figure_6.png",file:"assets/publication_figures/Figure_6.png",vector:"assets/publication_figures/Figure_6.svg",pdf:"assets/publication_figures/Figure_6.pdf",tiff:"assets/publication_figures/Figure_6.tif"}
);
DB.stats.figures = DB.figures.length;
const $ = (id) => document.getElementById(id);
const cn = (s) => s || "";

function stageText(stages) {
  if (!stages || !stages.length) return "See file column names";
  const shown = stages.slice(0, 12).join(" / ");
  return stages.length > 12 ? shown + " ..." : shown;
}

function formatScientificName(value) {
  return escapeHtml(value).replace(/\bsp\.$/, '<span class="taxon-rank">sp.</span>');
}

function renderSpecies() {
  $("speciesGrid").innerHTML = DB.species.map(s => {
    const typeTags = Object.entries(s.data_types || {}).map(([k,v]) => `<span class="tag blue">${k} x ${v}</span>`).join("");
    const supp = s.supplementary_count ? `<span class="tag rose">supplement x ${s.supplementary_count}</span>` : "";
    const stage = s.stages && s.stages.length ? s.stages.join(" / ") : "Supplementary trend or integrated matrix";
    return `<article class="species-card">
      <h3><span>${formatScientificName(s.cn)}</span><span class="tag green">${s.abbr}</span></h3>
      <div class="latin">${s.latin}</div>
      <div class="tags"><span class="tag">${s.project}</span><span class="tag amber">${s.matrix_count} matrices</span><span class="tag">${s.max_columns} columns max</span>${typeTags}${supp}</div>
      <div class="stage-list"><strong>Stages/treatments: </strong>${stage}</div>
      <div class="stage-list">${s.note}</div>
    </article>`;
  }).join("");
}

function initFilters() {
  const species = [...new Set([...DB.expression.map(x=>x.species_cn), ...DB.supplementary.map(x=>x.species_cn)])].sort();
  $("speciesFilter").innerHTML += species.map(x => `<option>${x}</option>`).join("");
  const groups = [...new Set(DB.figures.map(x=>x.group))].sort();
  $("figureFilter").innerHTML += groups.map(x => `<option value="${x}">${x}</option>`).join("");
}

function renderData() {
  const q = $("dataSearch").value.trim().toLowerCase();
  const sp = $("speciesFilter").value;
  const typ = $("typeFilter").value;
  const rows = [
    ...DB.expression.map(x => ({...x, kind:"expression"})),
    ...DB.supplementary.map((x,i) => ({id:`S${String(i+1).padStart(3,"0")}`, species_cn:x.species_cn, latin:"", data_type:x.data_type, columns:"-", matched:"-", unmatched:"-", stages:[x.note], file:x.file, size:x.size, link:x.link, kind:"supplementary"}))
  ].filter(x => {
    const hay = `${x.id} ${x.species_cn} ${x.latin} ${x.data_type} ${x.file} ${stageText(x.stages)}`.toLowerCase();
    return (!q || hay.includes(q)) && (!sp || x.species_cn === sp) && (!typ || x.data_type === typ);
  });
  $("dataBody").innerHTML = rows.map(x => `<tr>
    <td>${x.id}</td><td><strong>${formatScientificName(x.species_cn)}</strong><br><span class="latin">${x.latin || ""}</span></td>
    <td><span class="tag ${x.data_type==='chip_trend'?'rose':'blue'}">${x.data_type}</span></td>
    <td>${x.columns}</td><td>${stageText(x.stages)}</td><td>${x.size}</td>
    <td>${DB.single_file ? `<span class="file-label">${escapeHtml(x.file)}</span><br><span class="gene-meta">Raw matrix is not embedded in the GitHub single-file edition</span>` : `<a class="download" href="${x.link}">${escapeHtml(x.file)}</a>`}</td>
  </tr>`).join("");
}

function renderSharedBars() {
  const rows = [
    ["Cal->Glo", 32, 7, 39],
    ["Glo->Hrt", 51, 12, 63],
    ["Hrt->Tor", 4, 6, 10],
    ["Tor->Cot", 35, 0, 35],
  ];
  const max = Math.max(...rows.map(r=>r[3]));
  $("sharedBars").innerHTML = rows.map(([name, up, down, total]) => {
    const upW = up / max * 100;
    const downW = down / max * 100;
    return `<div class="bar-row"><strong>${name}</strong><div class="bar-bg"><span class="bar-up" style="width:${upW}%"></span><span class="bar-down" style="width:${downW}%"></span></div><span>${up}/${down}</span></div>`;
  }).join("");
}

const loadedGeneChunks = {};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function formatExpr(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function initGeneSearch() {
  const chunks = DB.gene_chunks || {};
  const rows = Object.entries(chunks).sort((a,b) => (a[1].species_cn || a[0]).localeCompare(b[1].species_cn || b[0], "zh"));
  $("geneSpecies").innerHTML += rows.map(([abbr,x]) => `<option value="${abbr}">${x.species_cn} (${abbr}, ${x.records} records)</option>`).join("");
  if (!rows.length) {
    $("geneStatus").textContent = "No gene-search index was generated.";
  } else {
    const total = rows.reduce((s, [,x]) => s + Number(x.records || 0), 0);
    $("geneStatus").textContent = `Built ${rows.length} species indexes with ${total.toLocaleString()} gene/protein records.`;
  }
}

function inferGeneSpecies(query) {
  const q = query.toUpperCase();
  const hits = [];
  if (q.startsWith("CULA")) hits.push("CULA");
  if (q.startsWith("LCHI")) hits.push("Lc");
  if (q.startsWith("CMMAHOGANY")) hits.push("Cm");
  if (q.startsWith("L1049_")) hits.push("Lf");
  if (q.startsWith("MA_")) hits.push("Pa");
  if (q.startsWith("TRINITY")) hits.push("Hi");
  if (/^\d+$/.test(q)) hits.push("Zm");
  if (q.startsWith("NP_") || q.startsWith("XP_")) hits.push("Vv", "Qs");
  return [...new Set(hits)].filter(abbr => DB.gene_chunks && DB.gene_chunks[abbr]);
}

function waitBeforeRetry(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function fetchArrayBufferWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 120000) : null;
    try {
      const response = await fetch(url, {
        cache: "force-cache",
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await waitBeforeRetry(700 * attempt);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw new Error(`Index download failed after ${attempts} attempts: ${lastError?.message || lastError}`);
}

async function loadExternalGeneChunk(abbr, url) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser is too old for the compressed gene index. Please update Chrome, Edge, Firefox or Safari.");
  }
  const compressed = await fetchArrayBufferWithRetry(url);
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  const marker = `window.GENE_INDEX_CHUNKS["${abbr}"] = `;
  const body = text.includes(marker)
    ? text.split(marker, 2)[1].trim().replace(/;\s*$/, "")
    : text;
  const chunk = JSON.parse(body);
  window.GENE_INDEX_CHUNKS[abbr] = chunk;
  return chunk;
}

function loadGeneChunk(abbr) {
  window.GENE_INDEX_CHUNKS = window.GENE_INDEX_CHUNKS || {};
  if (window.GENE_INDEX_CHUNKS[abbr]) return Promise.resolve(window.GENE_INDEX_CHUNKS[abbr]);
  if (loadedGeneChunks[abbr]) return loadedGeneChunks[abbr];
  const meta = DB.gene_chunks && DB.gene_chunks[abbr];
  if (!meta || !meta.link) return Promise.resolve(null);
  loadedGeneChunks[abbr] = loadExternalGeneChunk(abbr, meta.link).catch(error => {
    delete loadedGeneChunks[abbr];
    throw error;
  });
  return loadedGeneChunks[abbr];
}

function makeHit(chunk, record) {
  return { chunk, record, dataset: chunk.datasets[record[1]] || {stages:[]} };
}

function searchChunk(chunk, query, mode, limit) {
  const q = query.toUpperCase();
  const out = [];
  for (const record of chunk.records || []) {
    const id = String(record[0] || "");
    const key = id.toUpperCase();
    const ok = mode === "exact" ? key === q : (mode === "prefix" ? key.startsWith(q) : key.includes(q));
    if (ok) {
      out.push(makeHit(chunk, record));
      if (out.length >= limit) break;
    }
  }
  return out;
}

function sparkline(values) {
  const numeric = values.map(v => Number(v)).filter(v => Number.isFinite(v));
  if (!numeric.length) return `<svg class="spark" viewBox="0 0 260 92" role="img"><text x="16" y="50" fill="#667085" font-size="12">No numeric expression</text></svg>`;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = max - min || 1;
  const usable = values.length > 1 ? values.length - 1 : 1;
  const points = values.map((v,i) => {
    const n = Number(v);
    const x = 12 + i * (236 / usable);
    const y = Number.isFinite(n) ? 78 - ((n - min) / span) * 58 : 78;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="spark" viewBox="0 0 260 92" role="img">
    <line x1="12" y1="78" x2="248" y2="78" stroke="#d9dee8"/>
    <polyline points="${points}" fill="none" stroke="#168a68" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="12" y="16" fill="#667085" font-size="11">min ${formatExpr(min)} · max ${formatExpr(max)}</text>
  </svg>`;
}

function expressionTable(stages, values) {
  const rows = (stages || []).map((stage, i) => `<tr><td>${escapeHtml(stage)}</td><td>${formatExpr(values[i])}</td></tr>`).join("");
  return `<div class="table-wrap"><table class="expr-mini"><thead><tr><th>Stage/treatment</th><th>Expression mean</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderGeneResults(results, query, partial) {
  if (!results.length) {
    $("geneResults").innerHTML = `<div class="empty-note">No result found for “${escapeHtml(query)}”。Try selecting a species or entering the full gene/protein ID.</div>`;
    return;
  }
  $("geneResults").innerHTML = results.map(hit => {
    const r = hit.record;
    const stages = hit.dataset.stages || [];
    const values = r[2] || [];
    const annotation = r[7] ? `<div class="annotation"><strong>Annotation: </strong>${escapeHtml(r[7])}</div>` : `<div class="annotation"><strong>Annotation: </strong>The current matrix does not provide NR/functional annotation; it can be supplemented from the source matrix or later DIAMOND annotation tables.</div>`;
    const category = r[8] ? `<span class="tag amber">${escapeHtml(r[8])}</span>` : "";
    const source = DB.single_file ? `<span class="gene-meta">Source matrix: ${escapeHtml(hit.dataset.file || "")}</span>` : `<a class="download" href="${hit.dataset.link}">Source matrix</a>`;
    return `<article class="gene-hit">
      <div class="gene-hit-head">
        <div><div class="gene-id">${escapeHtml(r[0])}</div><div class="gene-meta">${escapeHtml(hit.chunk.species_cn)} · ${escapeHtml(hit.chunk.latin)} · ${escapeHtml(hit.dataset.label || "")}</div></div>
        <div class="tags"><span class="tag green">${escapeHtml(r[3])}</span><span class="tag blue">peak: ${escapeHtml(r[4] || "-")}</span><span class="tag rose">min: ${escapeHtml(r[5] || "-")}</span>${category}</div>
      </div>
      <div class="gene-summary">
        <div>${sparkline(values)}<div class="gene-meta" style="margin-top:6px">range: ${formatExpr(r[6])} · ${source}</div></div>
        ${expressionTable(stages, values)}
      </div>
      ${annotation}
    </article>`;
  }).join("");
  if (partial) {
    $("geneResults").insertAdjacentHTML("afterbegin", `<div class="empty-note">No exact ID was found; prefix/contains matches are shown below, up to ${results.length} records.</div>`);
  }
}

async function runGeneSearch() {
  const query = $("geneQuery").value.trim();
  if (!query) {
    $("geneResults").innerHTML = `<div class="empty-note">Please enter a gene or protein ID.</div>`;
    return;
  }
  const selected = $("geneSpecies").value;
  const inferred = inferGeneSpecies(query);
  let targets = selected ? [selected] : inferred;
  let autoDetected = "";
  if (selected && inferred.length === 1 && inferred[0] !== selected) {
    const detected = inferred[0];
    targets = [detected];
    $("geneSpecies").value = detected;
    const label = DB.gene_chunks?.[detected]?.species_cn || detected;
    autoDetected = `Auto-detected ${label} (${detected}) from the gene ID. `;
  }
  if (!targets.length) targets = Object.keys(DB.gene_chunks || {});
  if (!targets.length) {
    $("geneResults").innerHTML = `<div class="empty-note">No gene-search index is available.</div>`;
    return;
  }
  $("geneSearchBtn").disabled = true;
  $("geneStatus").textContent = `Loading/searching ${targets.join(", ")} ...`;
  try {
    const chunks = [];
    for (const abbr of targets) {
      const chunk = await loadGeneChunk(abbr);
      if (chunk) chunks.push(chunk);
    }
    let results = [];
    for (const chunk of chunks) results.push(...searchChunk(chunk, query, "exact", 100));
    let partial = false;
    if (!results.length) {
      partial = true;
      for (const chunk of chunks) {
        results.push(...searchChunk(chunk, query, "prefix", Math.max(1, 30 - results.length)));
        if (results.length >= 30) break;
      }
      if (!results.length) {
        for (const chunk of chunks) {
          results.push(...searchChunk(chunk, query, "contains", Math.max(1, 30 - results.length)));
          if (results.length >= 30) break;
        }
      }
    }
    $("geneStatus").textContent = `${autoDetected}Search complete:${results.length} results.`;
    renderGeneResults(results.slice(0, 30), query, partial);
  } catch (err) {
    $("geneStatus").textContent = err.message || String(err);
    const hint = DB.single_file ? "Index loading failed。The single-file edition requires a recent Chrome, Edge or Firefox with in-browser gzip decompression support." : "Index loading failed. If opening the HTML directly still fails, confirm that the companion files for the local full version are present.";
    $("geneResults").innerHTML = `<div class="empty-note">${hint}</div>`;
  } finally {
    $("geneSearchBtn").disabled = false;
  }
}


let sraPage = 1;
const SRA_PAGE_SIZE = 25;

function compactDate(value) {
  return value ? String(value).split(" ")[0] : "-";
}

function formatSraSize(mb) {
  const n = Number(mb || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${Math.round(n).toLocaleString()} MB`;
}

function ncbiSraUrl(run) {
  return `https://www.ncbi.nlm.nih.gov/sra/${encodeURIComponent(run)}`;
}

function enaRunUrl(run) {
  return `https://www.ebi.ac.uk/ena/browser/view/${encodeURIComponent(run)}`;
}

function projectUrl(project) {
  if (!project) return "";
  const p = encodeURIComponent(project);
  return /^PRJEB|^ERP/i.test(project) ? `https://www.ebi.ac.uk/ena/browser/view/${p}` : `https://www.ncbi.nlm.nih.gov/bioproject/${p}`;
}

function initSraBrowser() {
  const data = DB.public_sra || {rows: [], summary: {}};
  const rows = data.rows || [];
  const summary = data.summary || {};
  $("sraRuns").textContent = Number(summary.runs || rows.length).toLocaleString();
  $("sraSpeciesCount").textContent = Number(summary.species || new Set(rows.map(x=>x.ScientificName).filter(Boolean)).size).toLocaleString();
  $("sraProjectCount").textContent = Number(summary.projects || new Set(rows.map(x=>x.BioProject).filter(Boolean)).size).toLocaleString();
  $("sraStrategyCount").textContent = Number(summary.strategies || new Set(rows.map(x=>x.LibraryStrategy).filter(Boolean)).size).toLocaleString();
  $("sraTotalSize").textContent = `${summary.total_size_gb || 0} GB`;

  const species = [...new Set(rows.map(x => x.ScientificName).filter(Boolean))].sort();
  const projects = [...new Set(rows.map(x => x.BioProject).filter(Boolean))].sort();
  const strategies = [...new Set(rows.map(x => x.LibraryStrategy).filter(Boolean))].sort();
  $("sraSpeciesFilter").innerHTML += species.map(x => `<option>${escapeHtml(x)}</option>`).join("");
  $("sraProjectFilter").innerHTML += projects.map(x => `<option>${escapeHtml(x)}</option>`).join("");
  $("sraStrategyFilter").innerHTML += strategies.map(x => `<option>${escapeHtml(x)}</option>`).join("");
}

function filteredSraRows() {
  const rows = (DB.public_sra && DB.public_sra.rows) || [];
  const q = $("sraSearch").value.trim().toLowerCase();
  const species = $("sraSpeciesFilter").value;
  const project = $("sraProjectFilter").value;
  const strategy = $("sraStrategyFilter").value;
  return rows.filter(x => {
    const hay = `${x.Run} ${x.BioProject} ${x.ScientificName} ${x.SampleName} ${x.LibraryName} ${x.LibraryStrategy} ${x.Platform} ${x.Model}`.toLowerCase();
    return (!q || hay.includes(q)) &&
      (!species || x.ScientificName === species) &&
      (!project || x.BioProject === project) &&
      (!strategy || x.LibraryStrategy === strategy);
  });
}

function sraLinks(row) {
  const links = [];
  if (row.Run) links.push(`<a href="${ncbiSraUrl(row.Run)}" target="_blank" rel="noopener">NCBI SRA</a>`);
  if (row.Run) links.push(`<a href="${enaRunUrl(row.Run)}" target="_blank" rel="noopener">ENA</a>`);
  const pUrl = projectUrl(row.BioProject || "");
  if (pUrl) links.push(`<a href="${pUrl}" target="_blank" rel="noopener">Project</a>`);
  if (row.download_path) links.push(`<a href="${escapeHtml(row.download_path)}" target="_blank" rel="noopener">Direct</a>`);
  return `<div class="sra-links">${links.join("") || "-"}</div>`;
}

function renderSraBrowser(reset = false) {
  if (reset) sraPage = 1;
  const rows = filteredSraRows();
  const totalPages = Math.max(1, Math.ceil(rows.length / SRA_PAGE_SIZE));
  sraPage = Math.min(Math.max(1, sraPage), totalPages);
  const start = (sraPage - 1) * SRA_PAGE_SIZE;
  const pageRows = rows.slice(start, start + SRA_PAGE_SIZE);
  $("sraBody").innerHTML = pageRows.length ? pageRows.map(x => `
    <tr>
      <td class="file-label"><a class="download" href="${ncbiSraUrl(x.Run)}" target="_blank" rel="noopener">${escapeHtml(x.Run || "-")}</a></td>
      <td><strong>${escapeHtml(x.ScientificName || "Unspecified")}</strong></td>
      <td>${escapeHtml(x.SampleName || "-")}</td>
      <td><span class="tag blue">${escapeHtml(x.LibraryStrategy || "-")}</span><br><span class="gene-meta">${escapeHtml(x.LibraryName || "")} ${escapeHtml(x.LibraryLayout || "")}</span></td>
      <td>${x.BioProject ? `<a class="download" href="${projectUrl(x.BioProject)}" target="_blank" rel="noopener">${escapeHtml(x.BioProject)}</a>` : "-"}</td>
      <td>${escapeHtml(x.Platform || "-")}<br><span class="gene-meta">${escapeHtml(x.Model || "")}</span></td>
      <td>${formatSraSize(x.size_MB)}</td>
      <td>${compactDate(x.ReleaseDate)}</td>
      <td>${sraLinks(x)}</td><td>${x.__i!=null?`<button type="button" class="sra-detail-btn" data-sra-detail="${x.__i}">View</button>`:"-"}</td>
    </tr>`).join("") : `<tr><td colspan="10" class="empty-note">No matching public SRA records.</td></tr>`;

  const buttons = [];
  buttons.push(`<span>${rows.length.toLocaleString()} matched records, page ${sraPage} of ${totalPages}</span>`);
  buttons.push(`<button type="button" onclick="sraPage=Math.max(1,sraPage-1);renderSraBrowser()">Previous</button>`);
  const first = Math.max(1, sraPage - 2);
  const last = Math.min(totalPages, sraPage + 2);
  for (let p = first; p <= last; p++) {
    buttons.push(`<button type="button" class="${p === sraPage ? "active" : ""}" onclick="sraPage=${p};renderSraBrowser()">${p}</button>`);
  }
  buttons.push(`<button type="button" onclick="sraPage=Math.min(${totalPages},sraPage+1);renderSraBrowser()">Next</button>`);
  $("sraPager").innerHTML = buttons.join("");
}

function renderFigures() {
  const g = $("figureFilter").value;
  const rows = DB.figures.filter(x => !g || x.group === g);
  $("figureGrid").innerHTML = rows.map((x,i) => `<article class="figure-card" data-i="${DB.figures.indexOf(x)}">
    <img src="${x.link}" alt="${x.title}" loading="lazy"><div class="fig-body"><h3>${x.title}</h3><p>${x.desc}</p><div class="tags" style="margin-top:8px"><span class="tag">${x.group}</span><span class="tag">${x.size}</span></div>${x.vector ? `<div class="figure-downloads"><a href="${x.vector}" download>SVG</a><a href="${x.pdf}" download>PDF</a><a href="${x.link}" download>PNG · 600 dpi</a><a href="${x.tiff}" download>TIFF · 600 dpi</a>${x.data ? `<a href="${x.data}" download>Source TSV</a>` : ``}</div>` : ``}</div>
  </article>`).join("");
  document.querySelectorAll(".figure-card").forEach(card => card.addEventListener("click", (event) => { if (event.target.closest("a")) return; openFigure(Number(card.dataset.i)); }));
}

function openFigure(i) {
  const x = DB.figures[i];
  $("modalTitle").textContent = x.title + " - " + x.desc;
  $("modalImg").src = x.link;
  $("modal").classList.add("open");
}
function cleanCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

function toTsv(rows, columns) {
  const header = columns.map(c => c.label).join("\t");
  const body = rows.map(row => columns.map(c => cleanCell(typeof c.value === "function" ? c.value(row) : row[c.key])).join("\t"));
  return [header, ...body].join("\n");
}

function downloadText(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function matrixExportRows() {
  const expression = (DB.expression || []).map(x => ({
    id:x.id, category:"expression", species:x.species_cn, abbr:x.abbr, data_type:x.data_type,
    columns:x.columns, matched:x.matched, unmatched:x.unmatched, stages:stageText(x.stages), file:x.file,
    size:x.size, source_path:x.source_path || "", link:x.link || ""
  }));
  const supplementary = (DB.supplementary || []).map((x,i) => ({
    id:`S${String(i+1).padStart(3,"0")}`, category:"supplementary", species:x.species_cn,
    abbr:x.abbr || "", data_type:x.data_type, columns:"", matched:"", unmatched:"",
    stages:x.note || "", file:x.file, size:x.size, source_path:x.source_path || "", link:x.link || ""
  }));
  return [...expression, ...supplementary];
}

function sraExportRows(filtered = false) {
  return (filtered ? filteredSraRows() : ((DB.public_sra && DB.public_sra.rows) || [])).map(x => ({
    Run:x.Run || "", ScientificName:x.ScientificName || "", SampleName:x.SampleName || "",
    LibraryStrategy:x.LibraryStrategy || "", LibraryLayout:x.LibraryLayout || "", LibraryName:x.LibraryName || "",
    BioProject:x.BioProject || "", Platform:x.Platform || "", Model:x.Model || "",
    size_MB:x.size_MB || "", ReleaseDate:compactDate(x.ReleaseDate),
    NCBI_SRA:x.Run ? ncbiSraUrl(x.Run) : "", ENA_Run:x.Run ? enaRunUrl(x.Run) : "",
    Project_URL:projectUrl(x.BioProject || ""), Direct_Download:x.download_path || ""
  }));
}

function bioprojectRows() {
  const map = new Map();
  (DB.species || []).forEach(s => {
    if (s.project && s.project !== "Integrated") map.set(s.project, {BioProject:s.project, Species:s.cn || s.species, Source:"species summary", URL:projectUrl(s.project)});
  });
  ((DB.public_sra && DB.public_sra.rows) || []).forEach(r => {
    if (!r.BioProject) return;
    const current = map.get(r.BioProject) || {BioProject:r.BioProject, Species:r.ScientificName || "", Source:"public SRA", URL:projectUrl(r.BioProject)};
    current.RunCount = Number(current.RunCount || 0) + 1;
    map.set(r.BioProject, current);
  });
  return [...map.values()].sort((a,b) => String(a.BioProject).localeCompare(String(b.BioProject)));
}

function figureRows() {
  return (DB.figures || []).map(x => ({title:x.title, group:x.group, description:x.desc, size:x.size, file:x.file || ""}));
}

function geneIndexRows() {
  return Object.entries(DB.gene_chunks || {}).map(([abbr,x]) => ({abbr, species:x.species_cn || "", records:x.records || 0, compressed_bytes:x.compressed_bytes || ""}));
}

function metadataPackage() {
  return {
    title: document.title,
    generated_at: new Date().toISOString(),
    stats: DB.stats,
    species: DB.species,
    expression_inventory: matrixExportRows(),
    public_sra_summary: DB.public_sra ? DB.public_sra.summary : {},
    public_sra_links: sraExportRows(false),
    bioprojects: bioprojectRows(),
    figures: figureRows(),
    gene_index_summary: geneIndexRows()
  };
}

function handleDownload(kind) {
  const matrixHeaders = ["id","category","species","abbr","data_type","columns","matched","unmatched","stages","file","size","source_path","link"].map(key => ({key, label:key}));
  const sraHeaders = ["Run","ScientificName","SampleName","LibraryStrategy","LibraryLayout","LibraryName","BioProject","Platform","Model","size_MB","ReleaseDate","NCBI_SRA","ENA_Run","Project_URL","Direct_Download"].map(key => ({key, label:key}));
  const bioHeaders = ["BioProject","Species","Source","RunCount","URL"].map(key => ({key, label:key}));
  const figHeaders = ["title","group","description","size","file"].map(key => ({key, label:key}));
  const geneHeaders = ["abbr","species","records","compressed_bytes"].map(key => ({key, label:key}));
  if (kind === "matrix-tsv") downloadText("PlantSE_DB_matrix_inventory.tsv", toTsv(matrixExportRows(), matrixHeaders), "text/tab-separated-values;charset=utf-8");
  if (kind === "matrix-json") downloadText("PlantSE_DB_matrix_inventory.json", JSON.stringify(matrixExportRows(), null, 2), "application/json;charset=utf-8");
  if (kind === "sra-all") downloadText("PlantSE_DB_public_sra_links_all.tsv", toTsv(sraExportRows(false), sraHeaders), "text/tab-separated-values;charset=utf-8");
  if (kind === "sra-filtered") downloadText("PlantSE_DB_public_sra_links_filtered.tsv", toTsv(sraExportRows(true), sraHeaders), "text/tab-separated-values;charset=utf-8");
  if (kind === "bioprojects") downloadText("PlantSE_DB_bioproject_links.tsv", toTsv(bioprojectRows(), bioHeaders), "text/tab-separated-values;charset=utf-8");
  if (kind === "figures") downloadText("PlantSE_DB_figure_inventory.tsv", toTsv(figureRows(), figHeaders), "text/tab-separated-values;charset=utf-8");
  if (kind === "gene-index") downloadText("PlantSE_DB_gene_index_summary.tsv", toTsv(geneIndexRows(), geneHeaders), "text/tab-separated-values;charset=utf-8");
  if (kind === "metadata-json") downloadText("PlantSE_DB_metadata_package.json", JSON.stringify(metadataPackage(), null, 2), "application/json;charset=utf-8");
}

function initDownloadCenter() {
  document.querySelectorAll("[data-download]").forEach(btn => btn.addEventListener("click", () => handleDownload(btn.dataset.download)));
  if ($("downloadStatus")) {
    const sraCount = ((DB.public_sra && DB.public_sra.rows) || []).length;
    $("downloadStatus").textContent = `Ready: ${matrixExportRows().length.toLocaleString()} matrix/supplementary records, ${sraCount.toLocaleString()} public SRA records, ${bioprojectRows().length.toLocaleString()} project links.`;
  }
}

const pubmedState = {results: []};

function initPubMedSearch() {
  const species = [...new Set([
    ...((DB.public_sra && DB.public_sra.rows) || []).map(x => x.ScientificName),
    ...(DB.species || []).map(x => x.cn)
  ].filter(x => x && !/Cross-species/i.test(x)))].sort();
  $("pubmedSpecies").innerHTML += species.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
}

function buildPubMedTerm() {
  const query = $("pubmedQuery").value.trim() || "somatic embryogenesis transcriptome";
  const species = $("pubmedSpecies").value.trim();
  const year = Number($("pubmedYearStart").value || 0);
  const parts = [`(${query})`];
  if (species) parts.push(`("${species}"[Title/Abstract] OR "${species}"[All Fields])`);
  if (year >= 1950) parts.push(`${year}:3000[pdat]`);
  return parts.join(" AND ");
}

function pubmedDoi(item) {
  const ids = item.articleids || [];
  const hit = ids.find(x => String(x.idtype || "").toLowerCase() === "doi");
  return hit ? hit.value : "";
}

function pubmedAuthors(item) {
  return (item.authors || []).slice(0, 6).map(a => a.name).filter(Boolean).join(", ");
}

async function runPubMedSearch() {
  const retmax = Math.min(100, Math.max(1, Number($("pubmedRetMax").value || 20)));
  const apiKey = $("pubmedApiKey").value.trim();
  const term = buildPubMedTerm();
  $("pubmedStatus").textContent = "Querying PubMed through NCBI E-utilities...";
  $("pubmedResults").innerHTML = "";
  try {
    const searchParams = new URLSearchParams({db:"pubmed", retmode:"json", sort:"relevance", retmax:String(retmax), term, tool:"PlantSEDB"});
    if (apiKey) searchParams.set("api_key", apiKey);
    const searchRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams.toString()}`);
    if (!searchRes.ok) throw new Error(`PubMed esearch failed: ${searchRes.status}`);
    const searchJson = await searchRes.json();
    const ids = (searchJson.esearchresult && searchJson.esearchresult.idlist) || [];
    if (!ids.length) {
      pubmedState.results = [];
      $("pubmedStatus").textContent = "No PubMed records matched this query.";
      return;
    }
    const summaryParams = new URLSearchParams({db:"pubmed", retmode:"json", id:ids.join(","), tool:"PlantSEDB"});
    if (apiKey) summaryParams.set("api_key", apiKey);
    const summaryRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams.toString()}`);
    if (!summaryRes.ok) throw new Error(`PubMed esummary failed: ${summaryRes.status}`);
    const summaryJson = await summaryRes.json();
    pubmedState.results = (summaryJson.result.uids || []).map(uid => ({uid, ...summaryJson.result[uid]}));
    renderPubMedResults();
    $("pubmedStatus").textContent = `Found ${Number(searchJson.esearchresult.count || pubmedState.results.length).toLocaleString()} PubMed records; showing ${pubmedState.results.length}.`;
  } catch (err) {
    $("pubmedStatus").textContent = `PubMed API request failed: ${err.message}. If the page is opened from file:// and the browser blocks the request, serve this HTML from localhost or deploy it on GitHub Pages.`;
  }
}

function renderPubMedResults() {
  $("pubmedResults").innerHTML = pubmedState.results.map(item => {
    const doi = pubmedDoi(item);
    const doiLink = doi ? `<a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener">DOI</a>` : "";
    return `<article class="pubmed-card">
      <h3>${escapeHtml(item.title || "Untitled PubMed record")}</h3>
      <div class="meta">${escapeHtml(pubmedAuthors(item) || "Authors not listed")}<br>${escapeHtml(item.fulljournalname || item.source || "Journal not listed")} · ${escapeHtml(item.pubdate || "Date not listed")} · PMID ${escapeHtml(item.uid)}</div>
      <div class="pubmed-links"><a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(item.uid)}/" target="_blank" rel="noopener">PubMed</a>${doiLink}</div>
    </article>`;
  }).join("");
}

function exportPubMedResults() {
  if (!pubmedState.results.length) {
    $("pubmedStatus").textContent = "Run a PubMed search before exporting literature results.";
    return;
  }
  const rows = pubmedState.results.map(item => ({
    PMID:item.uid, Title:item.title || "", Authors:pubmedAuthors(item), Journal:item.fulljournalname || item.source || "",
    PubDate:item.pubdate || "", DOI:pubmedDoi(item), PubMed_URL:`https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`
  }));
  const headers = ["PMID","Title","Authors","Journal","PubDate","DOI","PubMed_URL"].map(key => ({key, label:key}));
  downloadText("PlantSE_DB_pubmed_results.tsv", toTsv(rows, headers), "text/tab-separated-values;charset=utf-8");
}

let primerDesignRows = [];
let blastSearchRows = [];

function parseFastaRecords(text, fallbackName = "sequence") {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const records = [];
  let name = fallbackName;
  let parts = [];
  let sawHeader = false;
  const flush = () => {
    const seq = parts.join("").replace(/[\s\d-]/g, "").toUpperCase();
    if (seq) records.push({name:name || fallbackName, sequence:seq});
    parts = [];
  };
  raw.split(/\r?\n/).forEach(line => {
    if (line.startsWith(">")) {
      if (sawHeader || parts.length) flush();
      sawHeader = true;
      name = line.slice(1).trim() || `${fallbackName}_${records.length + 1}`;
    } else {
      parts.push(line);
    }
  });
  flush();
  return records;
}

function reverseComplement(sequence) {
  const map = {A:"T", C:"G", G:"C", T:"A", U:"A", R:"Y", Y:"R", S:"S", W:"W", K:"M", M:"K", B:"V", V:"B", D:"H", H:"D", N:"N"};
  return sequence.toUpperCase().split("").reverse().map(base => map[base] || "N").join("");
}

function sequenceGc(sequence) {
  const count = (sequence.match(/[GC]/g) || []).length;
  return sequence.length ? count * 100 / sequence.length : 0;
}

function primerMeltingTemperature(sequence) {
  const gc = (sequence.match(/[GC]/g) || []).length;
  const at = sequence.length - gc;
  return sequence.length < 14 ? 2 * at + 4 * gc : 64.9 + 41 * (gc - 16.4) / sequence.length;
}

function maximumHomopolymer(sequence) {
  let best = 0;
  let run = 0;
  let previous = "";
  for (const base of sequence) {
    run = base === previous ? run + 1 : 1;
    previous = base;
    best = Math.max(best, run);
  }
  return best;
}

function maximumComplementaryRun(first, second) {
  const complement = reverseComplement(second);
  let best = 0;
  for (let shift = -complement.length + 1; shift < first.length; shift++) {
    let run = 0;
    for (let i = 0; i < first.length; i++) {
      const j = i - shift;
      if (j >= 0 && j < complement.length && first[i] === complement[j]) {
        run++;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
  }
  return best;
}

function parseNumericRange(value, label, lowerBound, upperBound) {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*[-–:]\s*(\d+(?:\.\d+)?)$/);
  if (!match) throw new Error(`${label} must use the format minimum-maximum.`);
  const low = Number(match[1]);
  const high = Number(match[2]);
  if (low < lowerBound || high > upperBound || low > high) throw new Error(`${label} is outside the allowed range.`);
  return [low, high];
}

function primerCandidate(sequence, position, length, tmMin, tmMax, gcMin, gcMax, reverse = false) {
  const binding = sequence.slice(position, position + length);
  if (!/^[ACGT]+$/.test(binding)) return null;
  const primer = reverse ? reverseComplement(binding) : binding;
  const tm = primerMeltingTemperature(primer);
  const gc = sequenceGc(primer);
  const clampGc = (primer.slice(-5).match(/[GC]/g) || []).length;
  const selfRun = maximumComplementaryRun(primer, primer);
  if (tm < tmMin || tm > tmMax || gc < gcMin || gc > gcMax) return null;
  if (maximumHomopolymer(primer) > 4 || clampGc < 1 || clampGc > 4 || selfRun > 6) return null;
  const score = Math.abs(tm - (tmMin + tmMax) / 2) + Math.abs(gc - 50) * 0.06 + selfRun * 0.35 + (/[GC]$/.test(primer) ? 0 : 0.8);
  return {sequence:primer, position, length, tm, gc, selfRun, score};
}

function setToolStatus(id, message, kind = "") {
  const node = $(id);
  node.textContent = message;
  node.className = `tool-status${kind ? ` ${kind}` : ""}`;
}

function designPrimers() {
  primerDesignRows = [];
  $("primerExportBtn").disabled = true;
  $("primerResults").innerHTML = "";
  try {
    const records = parseFastaRecords($("primerTemplate").value, "template");
    if (!records.length) throw new Error("Paste a DNA template before designing primers.");
    const template = records[0].sequence;
    if (!/^[ACGTN]+$/.test(template)) throw new Error("The template contains characters other than A, C, G, T or N.");
    if (template.length > 100000) throw new Error("The browser primer designer accepts templates up to 100,000 bases.");

    const primerLength = Number($("primerLength").value);
    if (!Number.isInteger(primerLength) || primerLength < 16 || primerLength > 35) throw new Error("Primer length must be an integer from 16 to 35.");
    const [productMin, productMax] = parseNumericRange($("primerProductRange").value, "Product size", 40, 10000);
    const [gcMin, gcMax] = parseNumericRange($("primerGcRange").value, "GC range", 0, 100);
    const tmMin = Number($("primerTmMin").value);
    const tmMax = Number($("primerTmMax").value);
    if (!Number.isFinite(tmMin) || !Number.isFinite(tmMax) || tmMin >= tmMax) throw new Error("Minimum Tm must be lower than maximum Tm.");
    const pairCount = Math.min(50, Math.max(1, Number($("primerPairCount").value) || 10));

    const suppliedStart = Number($("primerTargetStart").value);
    const suppliedEnd = Number($("primerTargetEnd").value);
    const midpoint = Math.ceil(template.length / 2);
    const targetStart = suppliedStart || suppliedEnd || midpoint;
    const targetEnd = suppliedEnd || suppliedStart || midpoint;
    if (!Number.isInteger(targetStart) || !Number.isInteger(targetEnd) || targetStart < 1 || targetEnd < targetStart || targetEnd > template.length) {
      throw new Error("Target coordinates must define a valid 1-based interval within the template.");
    }
    if (template.length < productMin) throw new Error("The template is shorter than the minimum product size.");

    const forwardCandidates = [];
    const reverseCandidates = [];
    const forwardStartMin = Math.max(0, targetStart - 1 - productMax);
    const forwardStartMax = Math.min(template.length - primerLength, targetStart - 1 - primerLength);
    const reverseStartMin = Math.max(0, targetEnd);
    const reverseStartMax = Math.min(template.length - primerLength, targetEnd - 1 + productMax);

    for (let pos = forwardStartMin; pos <= forwardStartMax; pos++) {
      const candidate = primerCandidate(template, pos, primerLength, tmMin, tmMax, gcMin, gcMax, false);
      if (candidate) forwardCandidates.push(candidate);
    }
    for (let pos = reverseStartMin; pos <= reverseStartMax; pos++) {
      const candidate = primerCandidate(template, pos, primerLength, tmMin, tmMax, gcMin, gcMax, true);
      if (candidate) reverseCandidates.push(candidate);
    }

    forwardCandidates.sort((a,b) => a.score - b.score);
    reverseCandidates.sort((a,b) => a.score - b.score);
    const forwards = forwardCandidates.slice(0, 500);
    const reverses = reverseCandidates.slice(0, 500);
    const pairs = [];
    for (const forward of forwards) {
      for (const reverse of reverses) {
        const productSize = reverse.position + primerLength - forward.position;
        if (productSize < productMin || productSize > productMax) continue;
        const tmDifference = Math.abs(forward.tm - reverse.tm);
        if (tmDifference > 4) continue;
        const pairRun = maximumComplementaryRun(forward.sequence, reverse.sequence);
        if (pairRun > 6) continue;
        const score = forward.score + reverse.score + tmDifference * 1.5 + pairRun * 0.45;
        pairs.push({forward, reverse, productSize, tmDifference, pairRun, score});
      }
    }
    pairs.sort((a,b) => a.score - b.score || a.productSize - b.productSize);
    primerDesignRows = pairs.slice(0, pairCount).map((pair, index) => ({
      rank:index + 1,
      forward:pair.forward.sequence,
      forwardStart:pair.forward.position + 1,
      forwardEnd:pair.forward.position + primerLength,
      forwardTm:pair.forward.tm,
      forwardGc:pair.forward.gc,
      reverse:pair.reverse.sequence,
      reverseStart:pair.reverse.position + primerLength,
      reverseEnd:pair.reverse.position + 1,
      reverseTm:pair.reverse.tm,
      reverseGc:pair.reverse.gc,
      productSize:pair.productSize,
      tmDifference:pair.tmDifference,
      pairRun:pair.pairRun,
      score:pair.score
    }));

    if (!primerDesignRows.length) {
      setToolStatus("primerStatus", `${forwardCandidates.length} forward and ${reverseCandidates.length} reverse candidates passed individual filters, but no compatible pair was found. Try widening the Tm/GC or product-size range.`, "error");
      return;
    }
    $("primerResults").innerHTML = `<h3>Recommended primer pairs</h3><div class="table-wrap"><table class="primer-table">
      <thead><tr><th>Rank</th><th>Forward primer (5′→3′)</th><th>F position</th><th>Tm / GC</th><th>Reverse primer (5′→3′)</th><th>R position</th><th>Tm / GC</th><th>Product</th><th>ΔTm</th><th>Pair comp.</th></tr></thead>
      <tbody>${primerDesignRows.map(row => `<tr><td>${row.rank}</td><td class="mono-seq">${row.forward}</td><td>${row.forwardStart}–${row.forwardEnd}</td><td>${row.forwardTm.toFixed(1)}°C / ${row.forwardGc.toFixed(1)}%</td><td class="mono-seq">${row.reverse}</td><td>${row.reverseStart}–${row.reverseEnd}</td><td>${row.reverseTm.toFixed(1)}°C / ${row.reverseGc.toFixed(1)}%</td><td>${row.productSize} bp</td><td>${row.tmDifference.toFixed(1)}°C</td><td>${row.pairRun} bases</td></tr>`).join("")}</tbody>
    </table></div><p class="sequence-note">In-silico screening is advisory. Confirm specificity against the appropriate reference genome/transcriptome and validate experimentally.</p>`;
    $("primerExportBtn").disabled = false;
    setToolStatus("primerStatus", `${forwardCandidates.length} forward and ${reverseCandidates.length} reverse candidates passed filters. Showing the best ${primerDesignRows.length} pair(s) spanning target ${targetStart}–${targetEnd}.`, "ok");
  } catch (error) {
    setToolStatus("primerStatus", error.message, "error");
  }
}

function exportPrimerResults() {
  if (!primerDesignRows.length) return;
  const header = ["rank","forward_primer_5to3","forward_start","forward_end","forward_tm_c","forward_gc_pct","reverse_primer_5to3","reverse_start","reverse_end","reverse_tm_c","reverse_gc_pct","product_size_bp","tm_difference_c","pair_complementary_run","score"];
  const rows = primerDesignRows.map(row => [row.rank,row.forward,row.forwardStart,row.forwardEnd,row.forwardTm.toFixed(2),row.forwardGc.toFixed(2),row.reverse,row.reverseStart,row.reverseEnd,row.reverseTm.toFixed(2),row.reverseGc.toFixed(2),row.productSize,row.tmDifference.toFixed(2),row.pairRun,row.score.toFixed(3)]);
  downloadText("CrossSE-TED_primer_design.tsv", [header, ...rows].map(row => row.join("\t")).join("\n"), "text/tab-separated-values;charset=utf-8");
}

function smithWaterman(query, subject, matchScore, mismatchScore, gapScore) {
  const rows = query.length + 1;
  const columns = subject.length + 1;
  if ((rows - 1) * (columns - 1) > 4000000) throw new Error(`Comparison ${query.length} × ${subject.length} exceeds the 4 million-cell browser limit.`);
  const scores = new Int32Array(rows * columns);
  const directions = new Uint8Array(rows * columns);
  let bestScore = 0;
  let bestRow = 0;
  let bestColumn = 0;
  for (let i = 1; i < rows; i++) {
    const rowOffset = i * columns;
    const previousOffset = (i - 1) * columns;
    for (let j = 1; j < columns; j++) {
      const diagonal = scores[previousOffset + j - 1] + (query[i - 1] === subject[j - 1] ? matchScore : mismatchScore);
      const up = scores[previousOffset + j] + gapScore;
      const left = scores[rowOffset + j - 1] + gapScore;
      const value = Math.max(0, diagonal, up, left);
      const index = rowOffset + j;
      scores[index] = value;
      directions[index] = value === 0 ? 0 : value === diagonal ? 1 : value === up ? 2 : 3;
      if (value > bestScore) {
        bestScore = value;
        bestRow = i;
        bestColumn = j;
      }
    }
  }
  let i = bestRow;
  let j = bestColumn;
  const alignedQuery = [];
  const alignedSubject = [];
  const middle = [];
  while (i > 0 && j > 0) {
    const direction = directions[i * columns + j];
    if (!direction || scores[i * columns + j] === 0) break;
    if (direction === 1) {
      const q = query[i - 1];
      const s = subject[j - 1];
      alignedQuery.push(q);
      alignedSubject.push(s);
      middle.push(q === s ? "|" : " ");
      i--;
      j--;
    } else if (direction === 2) {
      alignedQuery.push(query[i - 1]);
      alignedSubject.push("-");
      middle.push(" ");
      i--;
    } else {
      alignedQuery.push("-");
      alignedSubject.push(subject[j - 1]);
      middle.push(" ");
      j--;
    }
  }
  alignedQuery.reverse();
  alignedSubject.reverse();
  middle.reverse();
  const queryAlignment = alignedQuery.join("");
  const subjectAlignment = alignedSubject.join("");
  const midline = middle.join("");
  let identities = 0;
  let gaps = 0;
  for (let k = 0; k < queryAlignment.length; k++) {
    if (queryAlignment[k] === "-" || subjectAlignment[k] === "-") gaps++;
    else if (queryAlignment[k] === subjectAlignment[k]) identities++;
  }
  return {
    score:bestScore,
    queryStart:i + 1,
    queryEnd:bestRow,
    subjectStart:j + 1,
    subjectEnd:bestColumn,
    queryAlignment,
    subjectAlignment,
    midline,
    identities,
    gaps,
    alignmentLength:queryAlignment.length
  };
}

function formatLocalAlignment(hit) {
  const width = 60;
  const blocks = [];
  for (let offset = 0; offset < hit.queryAlignment.length; offset += width) {
    const q = hit.queryAlignment.slice(offset, offset + width);
    const mid = hit.midline.slice(offset, offset + width);
    const s = hit.subjectAlignment.slice(offset, offset + width);
    blocks.push(`Query  ${q}\n       ${mid}\nSbjct  ${s}`);
  }
  return blocks.join("\n\n");
}

function renderBlastResults() {
  if (!blastSearchRows.length) {
    $("blastResults").innerHTML = "";
    return;
  }
  $("blastResults").innerHTML = `<h3>Local alignment hits</h3>${blastSearchRows.map((hit, index) => {
    const identity = hit.alignmentLength ? hit.identities * 100 / hit.alignmentLength : 0;
    return `<article class="alignment-card">
      <div class="gene-hit-head"><div><div class="gene-id">#${index + 1} ${escapeHtml(hit.subjectName)}</div><div class="gene-meta">Query ${hit.queryStart}–${hit.queryEnd}; subject ${hit.displaySubjectStart}–${hit.displaySubjectEnd} (${hit.strand} strand)</div></div><span class="tag green">score ${hit.score}</span></div>
      <div class="alignment-summary"><span class="tag blue">${identity.toFixed(1)}% identity</span><span class="tag">${hit.identities}/${hit.alignmentLength} identical</span><span class="tag amber">${hit.gaps} gap columns</span><span class="tag">${hit.alignmentLength} aligned positions</span></div>
      <pre class="alignment-view">${escapeHtml(formatLocalAlignment(hit))}</pre>
    </article>`;
  }).join("")}<p class="sequence-note">This is a local pairwise alignment, not a replacement for a full BLAST database search. Statistical E-values are not estimated for user-supplied subject sequences.</p>`;
}

function runLocalBlast() {
  blastSearchRows = [];
  $("blastExportBtn").disabled = true;
  $("blastResults").innerHTML = "";
  const button = $("runBlastBtn");
  button.disabled = true;
  setToolStatus("blastStatus", "Computing local alignments…");
  window.setTimeout(() => {
    try {
      const type = $("blastType").value;
      const queryRecords = parseFastaRecords($("blastQuery").value, "query");
      const subjectRecords = parseFastaRecords($("blastSubject").value, "subject");
      if (!queryRecords.length || !subjectRecords.length) throw new Error("Provide both a query and at least one subject sequence.");
      if (subjectRecords.length > 25) throw new Error("A maximum of 25 subject FASTA records can be compared at once.");
      const query = queryRecords[0].sequence;
      const allowed = type === "nucleotide" ? /^[ACGTRYSWKMBDHVN]+$/ : /^[A-Z*]+$/;
      if (!allowed.test(query)) throw new Error(`The query contains characters invalid for ${type} sequence.`);
      subjectRecords.forEach(record => {
        if (!allowed.test(record.sequence)) throw new Error(`${record.name} contains characters invalid for ${type} sequence.`);
      });
      const matchScore = Number($("blastMatch").value);
      const mismatchScore = Number($("blastMismatch").value);
      const gapScore = Number($("blastGap").value);
      if (!(matchScore > 0 && mismatchScore < 0 && gapScore < 0)) throw new Error("Use a positive match score and negative mismatch/gap scores.");

      const hits = subjectRecords.map(record => {
        const plus = smithWaterman(query, record.sequence, matchScore, mismatchScore, gapScore);
        let best = {...plus, strand:"+", displaySubjectStart:plus.subjectStart, displaySubjectEnd:plus.subjectEnd};
        if (type === "nucleotide") {
          const reverse = smithWaterman(query, reverseComplement(record.sequence), matchScore, mismatchScore, gapScore);
          if (reverse.score > best.score) {
            best = {...reverse, strand:"−", displaySubjectStart:record.sequence.length - reverse.subjectStart + 1, displaySubjectEnd:record.sequence.length - reverse.subjectEnd + 1};
          }
        }
        return {...best, subjectName:record.name, subjectLength:record.sequence.length};
      }).filter(hit => hit.score > 0);
      hits.sort((a,b) => b.score - a.score || b.identities - a.identities);
      blastSearchRows = hits.slice(0, 10);
      renderBlastResults();
      $("blastExportBtn").disabled = !blastSearchRows.length;
      setToolStatus("blastStatus", blastSearchRows.length ? `Compared 1 query with ${subjectRecords.length} subject sequence(s); showing ${blastSearchRows.length} best hit(s).` : "No positive-scoring local alignment was found.", blastSearchRows.length ? "ok" : "error");
    } catch (error) {
      setToolStatus("blastStatus", error.message, "error");
    } finally {
      button.disabled = false;
    }
  }, 20);
}

function exportBlastResults() {
  if (!blastSearchRows.length) return;
  const header = ["rank","subject","score","identity_pct","identities","alignment_length","gaps","query_start","query_end","subject_start","subject_end","subject_strand"];
  const rows = blastSearchRows.map((hit, index) => [index + 1,hit.subjectName,hit.score,(hit.identities * 100 / hit.alignmentLength).toFixed(2),hit.identities,hit.alignmentLength,hit.gaps,hit.queryStart,hit.queryEnd,hit.displaySubjectStart,hit.displaySubjectEnd,hit.strand]);
  downloadText("CrossSE-TED_local_alignment.tsv", [header, ...rows].map(row => row.join("\t")).join("\n"), "text/tab-separated-values;charset=utf-8");
}

function makeExampleDna(length = 650) {
  let seed = 20260701;
  const bases = "ACGT";
  let sequence = "";
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    sequence += bases[(seed >>> 24) & 3];
  }
  return sequence;
}

function initSequenceTools() {
  $("designPrimerBtn").addEventListener("click", designPrimers);
  $("primerExportBtn").addEventListener("click", exportPrimerResults);
  $("primerExampleBtn").addEventListener("click", () => {
    $("primerTemplate").value = `>example_transcript_650bp\n${makeExampleDna().match(/.{1,70}/g).join("\n")}`;
    $("primerTargetStart").value = "300";
    $("primerTargetEnd").value = "340";
    setToolStatus("primerStatus", "Example loaded. Select “Design primers” to generate candidate pairs.");
  });
  $("runBlastBtn").addEventListener("click", runLocalBlast);
  $("blastExportBtn").addEventListener("click", exportBlastResults);
  $("blastExampleBtn").addEventListener("click", () => {
    const base = makeExampleDna(240);
    const related = base.slice(0, 85) + "GATTACA" + base.slice(92, 170) + "CCGT" + base.slice(174);
    $("blastQuery").value = `>example_query\n${base.match(/.{1,70}/g).join("\n")}`;
    $("blastSubject").value = `>related_sequence\n${related.match(/.{1,70}/g).join("\n")}\n>unrelated_sequence\n${makeExampleDna(180).split("").reverse().join("").match(/.{1,70}/g).join("\n")}`;
    setToolStatus("blastStatus", "Example loaded. Select “Run local alignment” to compare the sequences.");
  });
}

let knockoutPrimerRows = [];
let overexpressionPrimerRows = [];

function normalizeDnaAddition(value, label) {
  const sequence = String(value || "").replace(/[\s-]/g, "").toUpperCase();
  if (sequence && !/^[ACGTN]+$/.test(sequence)) throw new Error(`${label} may contain only A, C, G, T or N.`);
  return sequence;
}

function knockoutGuideScore(guide, gc) {
  const longestRun = maximumHomopolymer(guide);
  let score = 100 - Math.abs(gc - 50) * 1.5 - Math.max(0, longestRun - 2) * 5;
  if (guide.startsWith("G")) score += 3;
  if (guide.endsWith("GG")) score -= 3;
  return Math.max(0, Math.min(100, score));
}

function makeKnockoutRow(sequence, guide, pam, strand, start, end, cutLeft, addU6G, prefixes) {
  if (!/^[ACGT]{20}$/.test(guide) || /TTTT/.test(guide) || maximumHomopolymer(guide) > 4) return null;
  const gc = sequenceGc(guide);
  const expressedGuide = addU6G && !guide.startsWith("G") ? `G${guide}` : guide;
  return {
    guide,
    expressedGuide,
    pam,
    strand,
    start,
    end,
    cutLeft,
    cutLabel:`${cutLeft}/${cutLeft + 1}`,
    gc,
    score:knockoutGuideScore(guide, gc),
    forwardOligo:`${prefixes.forward}${expressedGuide}`,
    reverseOligo:`${prefixes.reverse}${reverseComplement(expressedGuide)}${prefixes.reverseSuffix}`
  };
}

function designKnockoutOligos() {
  knockoutPrimerRows = [];
  $("koExportBtn").disabled = true;
  $("koResults").innerHTML = "";
  try {
    const records = parseFastaRecords($("koTemplate").value, "knockout_target");
    if (!records.length) throw new Error("Paste a target gene or genomic sequence.");
    const sequence = records[0].sequence;
    if (!/^[ACGTN]+$/.test(sequence)) throw new Error("The target contains characters other than A, C, G, T or N.");
    if (sequence.length < 23) throw new Error("The target sequence is too short for guide design.");
    if (sequence.length > 100000) throw new Error("The browser designer accepts target sequences up to 100,000 bases.");

    const [gcMin, gcMax] = parseNumericRange($("koGcRange").value, "Guide GC range", 0, 100);
    const requestedCount = Math.min(50, Math.max(1, Number($("koGuideCount").value) || 10));
    const suppliedStart = Number($("koTargetStart").value);
    const suppliedEnd = Number($("koTargetEnd").value);
    const targetStart = suppliedStart || 1;
    const targetEnd = suppliedEnd || sequence.length;
    if (!Number.isInteger(targetStart) || !Number.isInteger(targetEnd) || targetStart < 1 || targetEnd < targetStart || targetEnd > sequence.length) {
      throw new Error("Target coordinates must define a valid 1-based interval.");
    }

    const nuclease = $("koNuclease").value;
    const pamLength = nuclease === "spcas9-ng" ? 2 : 3;
    const plusPam = nuclease === "spcas9-ng" ? /^[ACGT]G$/ : /^[ACGT]GG$/;
    const reversePam = nuclease === "spcas9-ng" ? /^C[ACGT]$/ : /^CC[ACGT]$/;
    const prefixes = {
      forward:normalizeDnaAddition($("koForwardPrefix").value, "Forward prefix"),
      reverse:normalizeDnaAddition($("koReversePrefix").value, "Reverse prefix"),
      reverseSuffix:normalizeDnaAddition($("koReverseSuffix").value, "Reverse suffix")
    };
    const addU6G = $("koAddU6G").checked;
    const candidates = [];

    for (let i = 0; i <= sequence.length - 20 - pamLength; i++) {
      const guide = sequence.slice(i, i + 20);
      const pam = sequence.slice(i + 20, i + 20 + pamLength);
      if (!plusPam.test(pam)) continue;
      const cutLeft = i + 17;
      if (cutLeft + 0.5 < targetStart || cutLeft + 0.5 > targetEnd) continue;
      const row = makeKnockoutRow(sequence, guide, pam, "+", i + 1, i + 20, cutLeft, addU6G, prefixes);
      if (row && row.gc >= gcMin && row.gc <= gcMax) candidates.push(row);
    }
    for (let i = 0; i <= sequence.length - 20 - pamLength; i++) {
      const pamReference = sequence.slice(i, i + pamLength);
      if (!reversePam.test(pamReference)) continue;
      const referenceProtospacer = sequence.slice(i + pamLength, i + pamLength + 20);
      const guide = reverseComplement(referenceProtospacer);
      const pam = reverseComplement(pamReference);
      const cutLeft = i + pamLength + 3;
      if (cutLeft + 0.5 < targetStart || cutLeft + 0.5 > targetEnd) continue;
      const row = makeKnockoutRow(sequence, guide, pam, "−", i + pamLength + 20, i + pamLength + 1, cutLeft, addU6G, prefixes);
      if (row && row.gc >= gcMin && row.gc <= gcMax) candidates.push(row);
    }

    const unique = new Map();
    candidates.forEach(row => {
      const key = `${row.guide}|${row.strand}|${row.start}|${row.end}`;
      if (!unique.has(key)) unique.set(key, row);
    });
    knockoutPrimerRows = [...unique.values()]
      .sort((a,b) => b.score - a.score || Math.abs(a.gc - 50) - Math.abs(b.gc - 50) || a.cutLeft - b.cutLeft)
      .slice(0, requestedCount)
      .map((row, index) => ({...row, rank:index + 1}));

    if (!knockoutPrimerRows.length) {
      setToolStatus("koStatus", "No guide passed the selected PAM, target-region and GC filters. Try expanding the target interval or GC range.", "error");
      return;
    }
    $("koResults").innerHTML = `<h3>Recommended knockout oligos</h3><div class="table-wrap"><table class="guide-table">
      <thead><tr><th>Rank</th><th>Guide (5′→3′)</th><th>PAM</th><th>Strand / coordinates</th><th>Cut</th><th>GC</th><th>Heuristic score</th><th>Forward cloning oligo</th><th>Reverse cloning oligo</th></tr></thead>
      <tbody>${knockoutPrimerRows.map(row => `<tr><td>${row.rank}</td><td class="mono-seq">${row.guide}</td><td class="mono-seq">${row.pam}</td><td>${row.strand} / ${row.start}–${row.end}</td><td>${row.cutLabel}</td><td>${row.gc.toFixed(1)}%</td><td>${row.score.toFixed(1)}</td><td class="mono-seq">${row.forwardOligo}</td><td class="mono-seq">${row.reverseOligo}</td></tr>`).join("")}</tbody>
    </table></div><p class="sequence-note">The cloning oligos use the prefixes/suffix entered above. Confirm the exact overhang convention required by your CRISPR vector and screen genome-wide off-targets before ordering.</p>`;
    $("koExportBtn").disabled = false;
    setToolStatus("koStatus", `Found ${candidates.length} eligible guide(s); showing the best ${knockoutPrimerRows.length} within target ${targetStart}–${targetEnd}.`, "ok");
  } catch (error) {
    setToolStatus("koStatus", error.message, "error");
  }
}

function exportKnockoutOligos() {
  if (!knockoutPrimerRows.length) return;
  const header = ["rank","guide_5to3","expressed_guide_5to3","pam","strand","protospacer_start","protospacer_end","cut_between","gc_pct","heuristic_score","forward_cloning_oligo_5to3","reverse_cloning_oligo_5to3"];
  const rows = knockoutPrimerRows.map(row => [row.rank,row.guide,row.expressedGuide,row.pam,row.strand,row.start,row.end,row.cutLabel,row.gc.toFixed(2),row.score.toFixed(2),row.forwardOligo,row.reverseOligo]);
  downloadText("CrossSE-TED_knockout_oligos.tsv", [header, ...rows].map(row => row.join("\t")).join("\n"), "text/tab-separated-values;charset=utf-8");
}

function terminalStopCodon(sequence) {
  return /(?:TAA|TAG|TGA)$/.test(sequence);
}

function designOverexpressionPrimers() {
  overexpressionPrimerRows = [];
  $("oeExportBtn").disabled = true;
  $("oeResults").innerHTML = "";
  try {
    const records = parseFastaRecords($("oeTemplate").value, "coding_sequence");
    if (!records.length) throw new Error("Paste a coding sequence or ORF.");
    let coding = records[0].sequence;
    if (!/^[ACGT]+$/.test(coding)) throw new Error("The coding sequence may contain only A, C, G and T.");
    if (coding.length > 100000) throw new Error("The browser designer accepts coding sequences up to 100,000 bases.");
    const annealLength = Number($("oeAnnealLength").value);
    if (!Number.isInteger(annealLength) || annealLength < 16 || annealLength > 35) throw new Error("Annealing length must be an integer from 16 to 35.");

    const changes = [];
    if ($("oeStartMode").value === "add" && !coding.startsWith("ATG")) {
      coding = `ATG${coding}`;
      changes.push("ATG added");
    }
    if ($("oeFrameMode").value === "trim" && coding.length % 3) {
      const removed = coding.length % 3;
      coding = coding.slice(0, -removed);
      changes.push(`${removed} incomplete terminal base(s) trimmed`);
    }
    if ($("oeStopMode").value === "remove" && terminalStopCodon(coding)) {
      coding = coding.slice(0, -3);
      changes.push("terminal stop removed");
    } else if ($("oeStopMode").value === "add" && !terminalStopCodon(coding)) {
      coding += "TAA";
      changes.push("TAA added");
    }
    if (coding.length < annealLength) throw new Error("The processed coding sequence is shorter than the annealing length.");

    const forwardTail = normalizeDnaAddition($("oeForwardTail").value, "Forward 5′ addition");
    const reverseTail = normalizeDnaAddition($("oeReverseTail").value, "Reverse 5′ addition");
    const forwardAnnealing = coding.slice(0, annealLength);
    const reverseAnnealing = reverseComplement(coding.slice(-annealLength));
    const forwardPrimer = `${forwardTail}${forwardAnnealing}`;
    const reversePrimer = `${reverseTail}${reverseAnnealing}`;
    const frameWarning = coding.length % 3 ? `Processed sequence length ${coding.length} is not divisible by 3.` : "";
    const startWarning = !coding.startsWith("ATG") ? "No 5′ ATG is present." : "";
    const notes = [...changes, frameWarning, startWarning].filter(Boolean);

    overexpressionPrimerRows = [
      {name:"Forward", full:forwardPrimer, tail:forwardTail, annealing:forwardAnnealing, tm:primerMeltingTemperature(forwardAnnealing), gc:sequenceGc(forwardAnnealing), length:forwardPrimer.length},
      {name:"Reverse", full:reversePrimer, tail:reverseTail, annealing:reverseAnnealing, tm:primerMeltingTemperature(reverseAnnealing), gc:sequenceGc(reverseAnnealing), length:reversePrimer.length}
    ];
    $("oeResults").innerHTML = `<h3>Overexpression cloning primers</h3>
      <div class="primer-output-grid">${overexpressionPrimerRows.map(row => `<div class="primer-output"><b>${row.name} primer (5′→3′)</b><div class="mono-seq">${row.full}</div><div class="sequence-note">5′ addition: ${row.tail || "none"} · annealing region: ${row.annealing} · Tm ${row.tm.toFixed(1)}°C · GC ${row.gc.toFixed(1)}% · total ${row.length} nt</div></div>`).join("")}</div>
      <div class="tags" style="margin-top:10px"><span class="tag green">Amplicon ${coding.length} bp</span><span class="tag blue">${coding.startsWith("ATG") ? "ATG present" : "ATG absent"}</span><span class="tag ${terminalStopCodon(coding) ? "amber" : ""}">${terminalStopCodon(coding) ? "terminal stop present" : "no terminal stop"}</span></div>
      ${notes.length ? `<p class="workflow-note">${notes.map(escapeHtml).join("; ")}.</p>` : ""}
      <p class="sequence-note">Tm and GC% describe only the template-annealing region; 5′ additions are excluded from those calculations.</p>`;
    $("oeExportBtn").disabled = false;
    setToolStatus("oeStatus", `Designed one primer pair for a ${coding.length} bp processed coding sequence${changes.length ? ` (${changes.join(", ")})` : ""}.`, frameWarning || startWarning ? "" : "ok");
  } catch (error) {
    setToolStatus("oeStatus", error.message, "error");
  }
}

function exportOverexpressionPrimers() {
  if (!overexpressionPrimerRows.length) return;
  const header = ["primer","full_sequence_5to3","five_prime_addition","annealing_sequence_5to3","annealing_tm_c","annealing_gc_pct","total_length_nt"];
  const rows = overexpressionPrimerRows.map(row => [row.name,row.full,row.tail,row.annealing,row.tm.toFixed(2),row.gc.toFixed(2),row.length]);
  downloadText("CrossSE-TED_overexpression_primers.tsv", [header, ...rows].map(row => row.join("\t")).join("\n"), "text/tab-separated-values;charset=utf-8");
}

function initFunctionalPrimerTools() {
  $("designKoBtn").addEventListener("click", designKnockoutOligos);
  $("koExportBtn").addEventListener("click", exportKnockoutOligos);
  $("koExampleBtn").addEventListener("click", () => {
    const example = makeExampleDna(900);
    $("koTemplate").value = `>example_knockout_target_900bp\n${example.match(/.{1,70}/g).join("\n")}`;
    $("koTargetStart").value = "150";
    $("koTargetEnd").value = "750";
    setToolStatus("koStatus", "Example loaded. Select “Design knockout oligos” to find candidate guides.");
  });
  $("designOeBtn").addEventListener("click", designOverexpressionPrimers);
  $("oeExportBtn").addEventListener("click", exportOverexpressionPrimers);
  $("oeExampleBtn").addEventListener("click", () => {
    const coding = `ATG${makeExampleDna(294)}TAA`;
    $("oeTemplate").value = `>example_coding_sequence_300bp\n${coding.match(/.{1,70}/g).join("\n")}`;
    $("oeForwardTail").value = "GCTAGCGGATCC";
    $("oeReverseTail").value = "GGTACCGAGCTC";
    setToolStatus("oeStatus", "Example loaded with illustrative 5′ additions. Replace them with sequences required by your vector.");
  });
}

renderSpecies();
initFilters();
initGeneSearch();
initSequenceTools();
initFunctionalPrimerTools();
renderData();
initSraBrowser();
renderSraBrowser();
renderSharedBars();
initDownloadCenter();
initPubMedSearch();
renderFigures();
["dataSearch","speciesFilter","typeFilter"].forEach(id => $(id).addEventListener("input", renderData));
["sraSearch","sraSpeciesFilter","sraProjectFilter","sraStrategyFilter"].forEach(id => $(id).addEventListener("input", () => renderSraBrowser(true)));
$("figureFilter").addEventListener("input", renderFigures);
$("geneSearchBtn").addEventListener("click", runGeneSearch);
$("geneQuery").addEventListener("keydown", (e) => { if (e.key === "Enter") runGeneSearch(); });
$("pubmedSearchBtn").addEventListener("click", runPubMedSearch);
$("pubmedExportBtn").addEventListener("click", exportPubMedResults);
$("pubmedQuery").addEventListener("keydown", (e) => { if (e.key === "Enter") runPubMedSearch(); });
$("modalClose").addEventListener("click", () => $("modal").classList.remove("open"));
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.remove("open"); });

/* ===== Module launcher and full-screen view routing ===== */
const MODULE_META = [
  {id:"species", title:"Species & Stages", desc:"11 species with matrix counts, sample columns and developmental stage coverage.", accent:"#0f8f6b", grad:"linear-gradient(135deg,#0f8f6b,#12a17a)", icon:"leaf"},
  {id:"modules", title:"Shared Modules", desc:"Conserved regulatory orthogroups and core somatic-embryogenesis findings.", accent:"#0d7a8c", grad:"linear-gradient(135deg,#0d7a8c,#1499b0)", icon:"share"},
  {id:"coexpression", title:"Coexpression Networks", desc:"Build gene-centered Pearson networks from full FPKM matrices and browse the published 357-edge study result.", accent:"#0b7285", grad:"linear-gradient(135deg,#0b7285,#19a3b8)", icon:"nodes"},
  {id:"stage-specificity", title:"Stage Specificity (τ)", desc:"Calculate τ, query the four expression-specificity classes and filter genes by peak stage.", accent:"#7b3fe4", grad:"linear-gradient(135deg,#6d28d9,#9d6bff)", icon:"chart"},
  {id:"gene-family", title:"Gene Families", desc:"Search key TF and non-TF families across ten species from curated NR annotation patterns.", accent:"#b7791f", grad:"linear-gradient(135deg,#a66a12,#dda630)", icon:"tftree"},
  {id:"evolution-case", title:"Ka/Ks & Microsynteny", desc:"Browse the PsbO/OEE1 evolutionary-constraint case, pairwise Ka/Ks values and synteny support.", accent:"#be3455", grad:"linear-gradient(135deg,#a92b4a,#e15478)", icon:"image"},
  {id:"gene-search", title:"Gene Search", desc:"Query stage-level expression, trend, peak/min stage and annotation by gene ID.", accent:"#2f6bff", grad:"linear-gradient(135deg,#2f6bff,#5b8bff)", icon:"search"},
  {id:"primer-design", title:"Primer Design", desc:"Design PCR primer pairs in-browser with Tm, GC and product-size filtering.", accent:"#c98a12", grad:"linear-gradient(135deg,#d9971a,#f0b53c)", icon:"primer"},
  {id:"functional-primer-design", title:"KO / OE Primers", desc:"CRISPR knockout guide oligos and overexpression cloning primers.", accent:"#d0416b", grad:"linear-gradient(135deg,#d0416b,#ec6b90)", icon:"dna"},
  {id:"blast", title:"BLAST", desc:"Offline Smith-Waterman local alignment against subject FASTA records.", accent:"#0d7a8c", grad:"linear-gradient(135deg,#0b6c7d,#17a2b8)", icon:"align"},
  {id:"data", title:"Transcriptome Data", desc:"72 sorted FPKM / CPM / readcount matrices with stage-ordered columns.", accent:"#0f8f6b", grad:"linear-gradient(135deg,#0f8f6b,#3aa981)", icon:"table"},
  {id:"sra", title:"Public RNA-seq", desc:"Curated public SRA runs with NCBI / ENA and BioProject links.", accent:"#2f6bff", grad:"linear-gradient(135deg,#2f6bff,#6aa1ff)", icon:"cloud"},
  {id:"literature", title:"Literature", desc:"PubMed search linked to database species and RNA-seq datasets.", accent:"#c98a12", grad:"linear-gradient(135deg,#c98a12,#e6ad35)", icon:"book"},
  {id:"figures", title:"Figure Gallery", desc:"33 integrated result figures, including all six frozen publication figures in vector and 600-dpi raster formats.", accent:"#d0416b", grad:"linear-gradient(135deg,#d0416b,#ef7396)", icon:"image"},
  {id:"downloads", title:"Download Center", desc:"Export matrix inventory, SRA links, project links and metadata.", accent:"#0d7a8c", grad:"linear-gradient(135deg,#0d7a8c,#14b0a0)", icon:"download"},
  {id:"expr-query", title:"Expression Query", desc:"Look up FPKM / read count / CPM for any gene across all samples in 10 species, with CSV / TSV export.", accent:"#7b3fe4", grad:"linear-gradient(135deg,#7b3fe4,#9d6bff)", icon:"chart"},
  {id:"ortho-query", title:"Orthologs", desc:"One-to-one orthogroups across 7 reference species plus dicot and gymnosperm subsets, with gene / protein / OrthoFinder ID lookup and CSV / TSV export.", accent:"#0d7a8c", grad:"linear-gradient(135deg,#0d7a8c,#22b0c4)", icon:"nodes"},
  {id:"deg-query", title:"Differential Expression", desc:"Significant DEGs (padj<0.05, |log2FC|>1) across 7 species and their stage / treatment comparisons; filter by direction and gene ID, with export.", accent:"#d0416b", grad:"linear-gradient(135deg,#c0392b,#e8615a)", icon:"volcano"},
  {id:"nr-annotation", title:"NR Annotation", desc:"Best-hit protein annotations against the NCBI NR database (DIAMOND blastp) for 10 species; search by gene / protein ID and export hit accession, identity, e-value, bitscore, coverage and description.", accent:"#8e44ad", grad:"linear-gradient(135deg,#6d28d9,#a855f7)", icon:"nrtag"},
  {id:"tf-query", title:"Transcription Factors", desc:"Putative transcription factors for 10 species, classified into families from NCBI NR best-hit descriptions; filter by species, TF family and gene / protein ID, with CSV / TSV export.", accent:"#16a34a", grad:"linear-gradient(135deg,#15803d,#22c55e)", icon:"tftree"}
];
const MODULE_ICONS = {
  leaf:'<path d="M5 21C4 12 9 4 20 4c0 11-8 16-15 15z"/><path d="M5 21c3-6 7-9 12-11"/>',
  share:'<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/>',
  search:'<circle cx="11" cy="11" r="6.4"/><path d="M20 20l-4.3-4.3"/>',
  primer:'<path d="M4 8h16M4 16h16"/><path d="M8 8v3M12 8v3M16 8v3M10 16v-3M14 16v-3"/>',
  dna:'<path d="M8 3c0 5 8 7 8 12M16 3c0 5-8 7-8 12M8 21c0-2 8-4 8 0M8 3c0 2 8 4 8 0"/>',
  align:'<path d="M4 6h13M4 12h16M4 18h10"/>',
  table:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  cloud:'<path d="M7 18a4 4 0 0 1 .5-8 5 5 0 0 1 9.6 1.3A3.5 3.5 0 0 1 17 18z"/><path d="M12 12v6M9.5 15.5L12 18l2.5-2.5"/>',
  book:'<path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M17 7h2v13H8"/>',
  image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4 3 2.5L16 11l3 3"/>',
  download:'<path d="M12 4v10M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  chart:'<path d="M4 4v16h16"/><path d="M8 14l3-4 3 2 4-6"/>',
  nodes:'<circle cx="6" cy="7" r="2.3"/><circle cx="18" cy="7" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M7.7 8.7l3.2 7.4M16.3 8.7l-3.2 7.4M8.2 6.7h7.6"/>',
  volcano:'<path d="M4 4v16h16"/><circle cx="8" cy="15" r="1.2"/><circle cx="11" cy="9" r="1.2"/><circle cx="16" cy="7" r="1.2"/><circle cx="14" cy="14" r="1.2"/>',
  nrtag:'<path d="M3 3h8l10 10-8 8L3 11V3z"/><circle cx="7.5" cy="7.5" r="1.6"/>',
  tftree:'<path d="M12 3v6"/><circle cx="12" cy="3" r="1.6"/><path d="M12 9c0 3-6 3-6 7"/><path d="M12 9c0 3 6 3 6 7"/><circle cx="6" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/><circle cx="12" cy="18" r="1.8"/><path d="M12 9v9"/>'
};
function moduleIcon(name){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${MODULE_ICONS[name]||""}</svg>`; }
function renderModuleGrid(){
  const host=$("moduleGrid");
  if(!host) return;
  host.innerHTML=MODULE_META.map(m=>`<button class="module-card" type="button" data-view="${m.id}" style="--card-accent:${m.accent}">
    <span class="module-ic" style="background:${m.grad}">${moduleIcon(m.icon)}</span>
    <h3>${m.title}</h3><p>${m.desc}</p>
    <span class="module-open">Open module &rarr;</span>
  </button>`).join("");
}
const MODULE_IDS = MODULE_META.map(m=>m.id);
function moduleTitleText(id){ const m=MODULE_META.find(x=>x.id===id); if(m) return m.title; const s=document.getElementById(id); const h=s&&s.querySelector("h2"); return h?h.textContent:id; }
function openModule(id){
  if(!MODULE_IDS.includes(id)) return;
  document.querySelectorAll(".module-host > section.section").forEach(s=>s.classList.remove("active"));
  const sec=document.getElementById(id);
  if(sec) sec.classList.add("active");
  document.body.classList.add("in-module");
  const t=$("moduleViewTitle"); if(t) t.textContent=moduleTitleText(id);
  try{ history.replaceState(null,"","#"+id); }catch(e){}
  window.scrollTo(0,0);
}
function goHome(){
  document.body.classList.remove("in-module");
  document.querySelectorAll(".module-host > section.section").forEach(s=>s.classList.remove("active"));
  try{ history.replaceState(null,"","#home"); }catch(e){}
  window.scrollTo(0,0);
}
document.addEventListener("click",(e)=>{
  const dv=e.target.closest("[data-view]");
  if(dv){ e.preventDefault(); openModule(dv.getAttribute("data-view")); return; }
  const hb=e.target.closest("[data-home]");
  if(hb){ e.preventDefault(); goHome(); return; }
  const a=e.target.closest('a[href^="#"]');
  if(a){ const id=a.getAttribute("href").slice(1); if(MODULE_IDS.includes(id)){ e.preventDefault(); openModule(id);} else if(id==="home"){ e.preventDefault(); goHome(); } }
});
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape" && document.body.classList.contains("in-module") && !$("modal").classList.contains("open")) goHome(); });
renderModuleGrid();
(function(){ const h=(location.hash||"").slice(1); if(MODULE_IDS.includes(h)) openModule(h); })();
/* ===== SRA browser: lazy-load curated Table S1 catalog (external gz, GitHub Pages friendly) ===== */
(function(){
  const DS_DIR = "datasets_data/";
  const SRA = { loaded:false, loading:false, full:null };

  async function gunzipToText(buf){
    const ds = new DecompressionStream("gzip");
    const stream = new Response(buf).body.pipeThrough(ds);
    return await new Response(stream).text();
  }
  function setSraStatus(msg, kind){
    const el = $("sraStatus"); if(!el) return;
    el.textContent = msg || "";
    el.className = "sra-status" + (kind ? (" "+kind) : "");
    el.style.display = msg ? "block" : "none";
  }
  function resetSelect(id){
    const sel = $(id); if(!sel) return;
    const first = sel.options[0];
    sel.innerHTML = "";
    if(first) sel.appendChild(first);
  }
  function csvCell(v){ v = (v==null) ? "" : String(v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }
  function downloadText(text, filename, mime){
    const blob = new Blob([text], {type:(mime||"text/plain")+";charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  }

  async function ensureSraData(){
    if(SRA.loaded || SRA.loading) return;
    SRA.loading = true;
    setSraStatus("Loading curated Table S1 catalog...", "loading");
    try{
      const res = await fetch(DS_DIR + "sra_datasets.json.gz");
      if(!res.ok) throw new Error("HTTP "+res.status);
      const buf = await res.arrayBuffer();
      const text = await gunzipToText(buf);
      const data = JSON.parse(text);
      SRA.full = data;
      const cols = data.columns;
      const idx = function(name){ return cols.indexOf(name); };
      const iRun=idx("Run"), iRel=idx("ReleaseDate"), iSpots=idx("spots"), iBases=idx("bases"),
            iSize=idx("size_MB"), iDl=idx("download_path"), iExp=idx("Experiment"),
            iLibN=idx("LibraryName"), iStrat=idx("LibraryStrategy"), iLayout=idx("LibraryLayout"),
            iPlat=idx("Platform"), iModel=idx("Model"), iProj=idx("BioProject"),
            iSample=idx("Sample"), iBioS=idx("BioSample"), iTax=idx("TaxID"),
            iSpecies=idx("ScientificName"), iSampleN=idx("SampleName");
      const rows = data.rows.map(function(r,i){ return {
        __i:i,
        Run:r[iRun], ReleaseDate:r[iRel], spots:r[iSpots], bases:r[iBases], size_MB:r[iSize],
        download_path:r[iDl], Experiment:r[iExp], LibraryName:r[iLibN], LibraryStrategy:r[iStrat],
        LibraryLayout:r[iLayout], Platform:r[iPlat], Model:r[iModel], BioProject:r[iProj],
        Sample:r[iSample], BioSample:r[iBioS], TaxID:r[iTax], ScientificName:r[iSpecies], SampleName:r[iSampleN]
      }; });
      const c = data.counts || {};
      DB.public_sra = { rows: rows, summary: {
        runs:c.runs, species:c.species, projects:c.projects, strategies:c.strategies, total_size_gb:c.total_size_gb
      }};
      resetSelect("sraSpeciesFilter"); resetSelect("sraProjectFilter"); resetSelect("sraStrategyFilter");
      initSraBrowser();
      renderSraBrowser(true);
      SRA.loaded = true;
      setSraStatus("Loaded curated Table S1: "+c.runs+" runs | "+c.species+" species | "+c.projects+" BioProjects | "+c.rna_seq_only+" RNA-Seq runs | "+c.total_size_gb+" GB total.", "ok");
    }catch(err){
      setSraStatus("Curated catalog not loaded. No run-level fallback is embedded in the page; open via a local server or GitHub Pages to load the authoritative datasets_data/sra_datasets.json.gz file. "+err, "warn");
    }finally{
      SRA.loading = false;
    }
  }

  function openSraDetail(i){
    if(!SRA.full) return;
    const cols = SRA.full.columns, row = SRA.full.rows[i];
    if(!row) return;
    const linkCols = {download_path:1, SRA_Run_URL:1, BioProject_URL:1, BioSample_URL:1, SRA_Experiment_URL:1, Download_URL:1};
    const body = cols.map(function(c,j){
      const v = (row[j]==null) ? "" : String(row[j]);
      if(!v) return "";
      let val = escapeHtml(v);
      if(linkCols[c] && /^https?:\/\//i.test(v)) val = '<a href="'+escapeHtml(v)+'" target="_blank" rel="noopener">'+escapeHtml(v)+'</a>';
      return "<tr><th>"+escapeHtml(c)+"</th><td>"+val+"</td></tr>";
    }).filter(Boolean).join("");
    const runName = row[cols.indexOf("Run")] || "Run";
    $("sraModalTitle").textContent = runName + " - full metadata";
    $("sraModalBody").innerHTML = '<table class="sra-detail-table">'+body+'</table>';
    $("sraModal").classList.add("open");
  }

  function exportCurrentView(){
    if(!SRA.full){ return; }
    const rows = (typeof filteredSraRows==="function") ? filteredSraRows() : ((DB.public_sra&&DB.public_sra.rows)||[]);
    const cols = SRA.full.columns;
    const runIdx = cols.indexOf("Run");
    const wanted = {};
    rows.forEach(function(r){ wanted[r.Run]=1; });
    const lines = [cols.map(csvCell).join(",")];
    SRA.full.rows.forEach(function(r){ if(wanted[r[runIdx]]) lines.push(r.map(csvCell).join(",")); });
    downloadText(lines.join("\n"), "CrossSE-TED_SRA_current_view.csv", "text/csv");
  }

  document.addEventListener("click", function(e){
    if(e.target.closest('[data-view="sra"]')){ ensureSraData(); return; }
    const db = e.target.closest("[data-sra-detail]");
    if(db){ openSraDetail(Number(db.getAttribute("data-sra-detail"))); return; }
    if(e.target.id==="sraModalClose" || e.target.id==="sraModal"){ $("sraModal").classList.remove("open"); return; }
    if(e.target.id==="sraExportView"){ exportCurrentView(); return; }
  });
  document.addEventListener("keydown", function(e){
    if(e.key==="Escape"){ const m=$("sraModal"); if(m && m.classList.contains("open")) m.classList.remove("open"); }
  });
  if((location.hash||"").slice(1)==="sra"){ ensureSraData(); }
})();
/* ===== Expression Query module (lazy per-species matrices, in-browser gunzip) ===== */
(function(){
  const DATA_DIR = "expression_data/";
  const EQ = { index:null, inited:false, loading:false, cache:{}, last:null };
  function $id(x){ return document.getElementById(x); }
  function setStatus(msg){ const el=$id("eqStatus"); if(el) el.textContent=msg; }
  function esc(s){ return String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function speciesInfo(id){ return EQ.index && EQ.index.species.find(s=>s.id===id); }

  async function ensureInit(){
    if(EQ.inited || EQ.loading) return;
    EQ.loading = true;
    try{
      const r = await fetch(DATA_DIR + "index.json", {cache:"force-cache"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      EQ.index = await r.json();
      const sel = $id("eqSpecies");
      if(sel){ sel.innerHTML = EQ.index.species.map(s=>`<option value="${s.id}">${s.label}</option>`).join(""); }
      EQ.inited = true;
      setStatus("Select a species, paste gene IDs, then click Query.");
      refreshFullDl();
    }catch(err){
      setStatus("Could not load the expression index. If you opened the local HTML file directly, start a small web server (e.g. python -m http.server) or use the GitHub Pages URL. Details: "+err.message);
    }finally{ EQ.loading = false; }
  }

  async function gunzipToText(buf){
    if(typeof DecompressionStream === "function"){
      const ds = new DecompressionStream("gzip");
      const stream = new Response(buf).body.pipeThrough(ds);
      return await new Response(stream).text();
    }
    throw new Error("This browser lacks gzip DecompressionStream support; please use a recent Chrome, Edge, Firefox or Safari.");
  }

  async function loadMatrix(spId, metric){
    const key = spId + "|" + metric;
    if(EQ.cache[key]) return EQ.cache[key];
    const sp = speciesInfo(spId);
    const info = sp.metrics[metric];
    if(!info) throw new Error("No "+metric+" matrix for "+spId);
    setStatus("Loading "+sp.label+" "+metric.toUpperCase()+" ("+(info.gzBytes/1048576).toFixed(1)+" MB compressed) ...");
    const r = await fetch(DATA_DIR + info.file, {cache:"force-cache"});
    if(!r.ok) throw new Error("HTTP "+r.status+" for "+info.file);
    const buf = await r.arrayBuffer();
    setStatus("Decompressing "+sp.label+" "+metric.toUpperCase()+" ...");
    const text = await gunzipToText(buf);
    setStatus("Indexing "+info.nGenes.toLocaleString()+" genes ...");
    const map = new Map();
    let start = text.indexOf("\n"); start = start<0 ? text.length : start+1;
    const len = text.length; let i = start;
    while(i < len){
      let nl = text.indexOf("\n", i); if(nl < 0) nl = len;
      if(nl > i){
        const tab = text.indexOf("\t", i);
        if(tab > i && tab < nl){
          const gene = text.slice(i, tab);
          const end = (text.charCodeAt(nl-1)===13) ? nl-1 : nl;
          map.set(gene, text.slice(tab+1, end));
        }
      }
      i = nl + 1;
    }
    const res = { samples: info.samples, map: map, nGenes: info.nGenes };
    EQ.cache[key] = res;
    return res;
  }

  function parseGeneIds(raw){
    const seen = new Set(); const out = [];
    raw.split(/[\s,;]+/).forEach(t=>{ t=t.trim(); if(t && !seen.has(t)){ seen.add(t); out.push(t); } });
    return out;
  }

  async function runQuery(){
    if(!EQ.inited){ await ensureInit(); if(!EQ.inited) return; }
    const spId = $id("eqSpecies").value;
    const metric = $id("eqMetric").value;
    const genes = parseGeneIds($id("eqGenes").value);
    if(genes.length === 0){ setStatus("Please enter at least one gene ID."); return; }
    let mx;
    try{ mx = await loadMatrix(spId, metric); }
    catch(err){ setStatus("Load failed: "+err.message); return; }
    const found = []; const missing = [];
    genes.forEach(g=>{ const rest = mx.map.get(g); if(rest===undefined) missing.push(g); else found.push({gene:g, values:rest.split("\t")}); });
    EQ.last = { spId, metric, samples: mx.samples, rows: found };
    renderTable();
    const miss = $id("eqMiss");
    miss.innerHTML = missing.length ? ("Not found ("+missing.length+"): " + missing.map(esc).join(", ")) : "";
    setStatus(found.length + " / " + genes.length + " gene(s) found in " + speciesInfo(spId).label + " " + metric.toUpperCase() + ".");
    $id("eqExportBar").style.display = found.length ? "flex" : "none";
  }

  function renderTable(){
    const wrap = $id("eqTableWrap");
    if(!EQ.last || !EQ.last.rows.length){ wrap.style.display="none"; wrap.innerHTML=""; return; }
    const s = EQ.last;
    let html = "<table class='eq-table'><thead><tr><th>Gene</th>" + s.samples.map(x=>"<th>"+esc(x)+"</th>").join("") + "</tr></thead><tbody>";
    html += s.rows.map(r=>{
      let cells = "";
      for(let k=0;k<s.samples.length;k++){ cells += "<td>"+esc(r.values[k]!==undefined?r.values[k]:"")+"</td>"; }
      return "<tr><th>"+esc(r.gene)+"</th>"+cells+"</tr>";
    }).join("");
    html += "</tbody></table>";
    wrap.innerHTML = html; wrap.style.display = "block";
  }

  function downloadText(name, text){
    const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  function buildDelimited(sep){
    const s = EQ.last;
    const lines = [["Gene"].concat(s.samples).join(sep)];
    s.rows.forEach(r=>{ lines.push([r.gene].concat(r.values.slice(0, s.samples.length)).join(sep)); });
    return lines.join("\n");
  }

  async function exportAllMetrics(){
    const s = EQ.last; if(!s) return;
    const sp = speciesInfo(s.spId);
    const genes = s.rows.map(r=>r.gene);
    const out = [];
    for(const m of ["fpkm","readcount","cpm"]){
      if(!sp.metrics[m]) continue;
      let mx; try{ mx = await loadMatrix(s.spId, m); }catch(e){ continue; }
      out.push("# "+sp.label+" "+m.toUpperCase());
      out.push(["Gene"].concat(mx.samples).join(","));
      genes.forEach(g=>{ const rest = mx.map.get(g); const vals = rest===undefined?[]:rest.split("\t"); out.push([g].concat(mx.samples.map((_,k)=> vals[k]!==undefined?vals[k]:"")).join(",")); });
      out.push("");
    }
    setStatus("Exported all metrics for "+sp.label+".");
    downloadText(sp.id+"_expression_query_all_metrics.csv", out.join("\n"));
  }

  function refreshFullDl(){
    const el = $id("eqFullDl"); if(!el || !EQ.index) return;
    const sp = speciesInfo($id("eqSpecies").value); if(!sp) return;
    const links = ["fpkm","readcount","cpm"].filter(m=>sp.metrics[m]).map(m=>{
      const info = sp.metrics[m];
      return `<a href="${DATA_DIR}${info.file}" download>${m.toUpperCase()} (${(info.gzBytes/1048576).toFixed(1)} MB)</a>`;
    }).join("");
    el.innerHTML = "<strong>Full matrix download (.tsv.gz):</strong><br>"+links;
  }

  document.addEventListener("click",(e)=>{
    if(e.target.closest('[data-view="expr-query"]')){ ensureInit(); }
    if(e.target.closest("#eqRun")){ runQuery(); return; }
    if(e.target.closest("#eqClear")){ $id("eqGenes").value=""; $id("eqMiss").textContent=""; $id("eqTableWrap").style.display="none"; $id("eqExportBar").style.display="none"; setStatus("Cleared."); return; }
    const exp = e.target.closest("[data-eq-export]");
    if(exp && EQ.last){
      const kind = exp.getAttribute("data-eq-export");
      if(kind==="csv") downloadText(EQ.last.spId+"_"+EQ.last.metric+".csv", buildDelimited(","));
      else if(kind==="tsv") downloadText(EQ.last.spId+"_"+EQ.last.metric+".tsv", buildDelimited("\t"));
      else if(kind==="all") exportAllMetrics();
    }
  });
  document.addEventListener("change",(e)=>{
    if(e.target.id==="eqSpecies"){ refreshFullDl(); }
    if(e.target.id==="eqMetric" && EQ.last && $id("eqGenes").value.trim()){ runQuery(); }
  });
  if((location.hash||"").slice(1)==="expr-query"){ ensureInit(); }
})();

/* ===== Orthologs module (lazy datasets, in-browser gunzip) ===== */
(function(){
  const DATA_DIR = "datasets_data/";
  const ORTHO_DATASETS = [
    {id:"all7_504", label:"7-species strict 1:1 (504 OGs)", file:"ortho_all7_504.json.gz"},
    {id:"dicot3_2885", label:"3 dicots 1:1 - Lc / Cm / Vv (2885 OGs)", file:"ortho_dicot3_2885.json.gz"},
    {id:"dicot3_strict504", label:"3 dicots - strict all-7 subset (504 OGs)", file:"ortho_dicot3_strict504.json.gz"},
    {id:"gymno_4059", label:"Gymnosperm CULA vs Picea 1:1 (4059 OGs)", file:"ortho_gymno_4059.json.gz"}
  ];
  const BROWSE_LIMIT = 300;
  const OQ = { ds:{}, current:null, data:null, idx:null, view:[], inited:false };
  function $id(x){ return document.getElementById(x); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function setStatus(m){ const el=$id("oqStatus"); if(el) el.textContent=m; }

  async function gunzipToText(buf){
    if(typeof DecompressionStream === "function"){
      const ds = new DecompressionStream("gzip");
      const stream = new Response(buf).body.pipeThrough(ds);
      return await new Response(stream).text();
    }
    throw new Error("This browser lacks gzip DecompressionStream support; please use a recent Chrome, Edge, Firefox or Safari.");
  }

  function idType(){ const el=document.querySelector('input[name="oqIdType"]:checked'); return el?el.value:"g"; }
  function proteinLink(v){
    if(/^[NXYW]P_\d/.test(v)) return '<a href="https://www.ncbi.nlm.nih.gov/protein/'+encodeURIComponent(v)+'" target="_blank" rel="noopener">'+esc(v)+'</a>';
    return esc(v);
  }

  async function loadDataset(id){
    if(OQ.ds[id]) return OQ.ds[id];
    const meta = ORTHO_DATASETS.find(d=>d.id===id);
    setStatus("Loading "+meta.label+" ...");
    const r = await fetch(DATA_DIR + meta.file, {cache:"force-cache"});
    if(!r.ok) throw new Error("HTTP "+r.status+" for "+meta.file);
    const buf = await r.arrayBuffer();
    setStatus("Decompressing "+meta.label+" ...");
    const data = JSON.parse(await gunzipToText(buf));
    const idx = new Map();
    data.rows.forEach((row,ri)=>{
      if(row.og && !idx.has(row.og)) idx.set(row.og, ri);
      ["g","p","o"].forEach(tp=>{ const arr=row[tp]||[]; for(const v of arr){ if(v && !idx.has(v)) idx.set(v, ri); } });
    });
    const obj = { data:data, idx:idx };
    OQ.ds[id] = obj;
    return obj;
  }

  async function ensureInit(){
    if(OQ.inited) return;
    const sel=$id("oqDataset");
    if(sel){ sel.innerHTML = ORTHO_DATASETS.map(d=>`<option value="${d.id}">${esc(d.label)}</option>`).join(""); }
    OQ.inited = true;
    await selectDataset();
  }

  async function selectDataset(){
    const id=$id("oqDataset").value;
    let obj;
    try{ obj=await loadDataset(id); }
    catch(e){ setStatus("Load failed: "+e.message+" - if you opened the local file directly, start a web server (python -m http.server) or use the GitHub Pages URL."); return; }
    OQ.current=id; OQ.data=obj.data; OQ.idx=obj.idx;
    runQuery();
  }

  function runQuery(){
    if(!OQ.data) return;
    const tp=idType();
    const raw=$id("oqGenes").value.trim();
    const miss=$id("oqMiss");
    if(!raw){
      OQ.view = OQ.data.rows.slice(0, BROWSE_LIMIT);
      miss.innerHTML="";
      renderTable(tp);
      setStatus("Showing first "+OQ.view.length+" of "+OQ.data.count.toLocaleString()+" orthogroups - paste IDs to search.");
      return;
    }
    const ids=raw.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean);
    const seen=new Set(); const rows=[]; const missing=[];
    ids.forEach(q=>{ const ri=OQ.idx.get(q); if(ri===undefined){ missing.push(q); return; } if(!seen.has(ri)){ seen.add(ri); rows.push(OQ.data.rows[ri]); } });
    OQ.view=rows;
    renderTable(tp);
    miss.innerHTML = missing.length ? ("Not found ("+missing.length+"): "+missing.map(esc).join(", ")) : "";
    setStatus(rows.length+" orthogroup(s) matched "+ids.length+" query ID(s).");
  }

  function cellFor(row,tp,si){
    const arr=row[tp]||[]; const v=arr[si]!==undefined?arr[si]:"";
    if(!v) return "";
    return (tp==="p") ? proteinLink(v) : esc(v);
  }

  function renderTable(tp){
    const wrap=$id("oqTableWrap");
    if(!OQ.data || !OQ.view.length){ wrap.style.display="none"; wrap.innerHTML=""; $id("oqExportBar").style.display="none"; return; }
    const sp=OQ.data.species;
    let html="<table class='oq-table'><thead><tr><th>Orthogroup</th>"+sp.map(s=>"<th>"+esc(s.label)+" ("+esc(s.short)+")</th>").join("")+"</tr></thead><tbody>";
    html+=OQ.view.map(row=>{
      let cells="";
      for(let si=0; si<sp.length; si++){ cells+="<td>"+cellFor(row,tp,si)+"</td>"; }
      return "<tr><th>"+esc(row.og)+"</th>"+cells+"</tr>";
    }).join("");
    html+="</tbody></table>";
    wrap.innerHTML=html; wrap.style.display="block";
    $id("oqExportBar").style.display="flex";
  }

  function buildDelimited(sep){
    const tp=idType(); const sp=OQ.data.species;
    const lines=[["Orthogroup"].concat(sp.map(s=>s.short)).join(sep)];
    OQ.view.forEach(row=>{ const vals=[row.og]; for(let si=0;si<sp.length;si++){ const arr=row[tp]||[]; vals.push(arr[si]!==undefined?arr[si]:""); } lines.push(vals.join(sep)); });
    return lines.join("\n");
  }
  function downloadText(name, text){
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },200);
  }

  document.addEventListener("click",(e)=>{
    if(e.target.closest('[data-view="ortho-query"]')){ ensureInit(); }
    if(e.target.closest("#oqRun")){ runQuery(); return; }
    if(e.target.closest("#oqClear")){ $id("oqGenes").value=""; runQuery(); return; }
    const exp=e.target.closest("[data-oq-export]");
    if(exp && OQ.view.length){
      const kind=exp.getAttribute("data-oq-export");
      const idl=(OQ.current||"ortho");
      if(kind==="csv") downloadText("orthologs_"+idl+".csv", buildDelimited(","));
      else if(kind==="tsv") downloadText("orthologs_"+idl+".tsv", buildDelimited("\t"));
    }
  });
  document.addEventListener("change",(e)=>{
    if(e.target.id==="oqDataset"){ selectDataset(); }
    if(e.target.name==="oqIdType" && OQ.data){ runQuery(); }
  });
  if((location.hash||"").slice(1)==="ortho-query"){ ensureInit(); }
})();

/* ===== Differential Expression module (lazy per-species DEGs, in-browser gunzip) ===== */
(function(){
  const DATA_DIR = "datasets_data/";
  const MAXROWS = 1500;
  const DG = { manifest:null, sp:{}, view:[], inited:false, loading:false };
  function $id(x){ return document.getElementById(x); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function setStatus(m){ const el=$id("dgStatus"); if(el) el.textContent=m; }

  async function gunzipToText(buf){
    if(typeof DecompressionStream === "function"){
      const ds = new DecompressionStream("gzip");
      const stream = new Response(buf).body.pipeThrough(ds);
      return await new Response(stream).text();
    }
    throw new Error("This browser lacks gzip DecompressionStream support; please use a recent Chrome, Edge, Firefox or Safari.");
  }

  function spMeta(k){ return DG.manifest && DG.manifest.species.find(s=>s.key===k); }

  async function ensureInit(){
    if(DG.inited || DG.loading) return;
    DG.loading=true;
    try{
      const r=await fetch(DATA_DIR+"deg_manifest.json",{cache:"force-cache"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      DG.manifest=await r.json();
      const sel=$id("dgSpecies");
      if(sel){ sel.innerHTML=DG.manifest.species.map(s=>`<option value="${s.key}">${esc(s.label)} - ${esc(s.group)} - ${s.total.toLocaleString()} DEGs</option>`).join(""); }
      DG.inited=true;
      fillComparisons();
      setStatus("Select a species and comparison, then click Query.");
    }catch(e){ setStatus("Could not load the DEG manifest. If you opened the local file directly, start a web server (python -m http.server) or use the GitHub Pages URL. Details: "+e.message); }
    finally{ DG.loading=false; }
  }

  function fillComparisons(){
    const sp=spMeta($id("dgSpecies").value); if(!sp) return;
    const sel=$id("dgComp");
    sel.innerHTML='<option value="__all__">All comparisons ('+sp.total.toLocaleString()+')</option>'+sp.comparisons.map(c=>'<option value="'+esc(c.name)+'">'+esc(c.name)+' ('+c.n.toLocaleString()+')</option>').join("");
  }

  async function loadSpecies(k){
    if(DG.sp[k]) return DG.sp[k];
    const sp=spMeta(k);
    setStatus("Loading "+sp.label+" DEGs ("+sp.total.toLocaleString()+" records) ...");
    const r=await fetch(DATA_DIR+sp.file,{cache:"force-cache"});
    if(!r.ok) throw new Error("HTTP "+r.status+" for "+sp.file);
    const buf=await r.arrayBuffer();
    setStatus("Decompressing "+sp.label+" ...");
    const data=JSON.parse(await gunzipToText(buf));
    DG.sp[k]=data;
    return data;
  }

  function direction(){ const el=document.querySelector('input[name="dgDir"]:checked'); return el?el.value:"all"; }
  function parseIds(raw){ const seen=new Set(); const out=[]; raw.split(/[\s,;]+/).forEach(x=>{ x=x.trim(); if(x && !seen.has(x)){ seen.add(x); out.push(x); } }); return out; }
  function fmtP(p){ if(p===0) return "0"; const a=Math.abs(p); if(a<1e-3||a>=1e5) return p.toExponential(2); return String(p); }

  async function runQuery(){
    if(!DG.inited){ await ensureInit(); if(!DG.inited) return; }
    const k=$id("dgSpecies").value;
    let data;
    try{ data=await loadSpecies(k); }catch(e){ setStatus("Load failed: "+e.message); return; }
    const comp=$id("dgComp").value;
    const dir=direction();
    const ids=parseIds($id("dgGenes").value);
    const gset=ids.length?new Set(ids):null;
    let rows=data.rows;
    if(comp!=="__all__") rows=rows.filter(r=>r.c===comp);
    if(dir==="up") rows=rows.filter(r=>r.lfc>0);
    else if(dir==="down") rows=rows.filter(r=>r.lfc<0);
    if(gset) rows=rows.filter(r=>gset.has(r.g));
    rows=rows.slice().sort((a,b)=>a.padj-b.padj);
    DG.view=rows;
    renderTable();
    const capped = rows.length>MAXROWS ? " (showing top "+MAXROWS+" by padj; export for the full list)" : "";
    setStatus(rows.length.toLocaleString()+" DEG(s) in "+spMeta(k).label+(comp!=="__all__"?" - "+comp:"")+(dir!=="all"?" - "+dir+"-regulated":"")+capped+".");
    $id("dgExportBar").style.display=rows.length?"flex":"none";
  }

  function renderTable(){
    const wrap=$id("dgTableWrap");
    if(!DG.view.length){ wrap.style.display="none"; wrap.innerHTML=""; return; }
    const rows=DG.view.slice(0, MAXROWS);
    let html="<table class='dg-table'><thead><tr><th>Gene</th><th>Comparison</th><th>log2FC</th><th>padj</th><th>Regulation</th></tr></thead><tbody>";
    html+=rows.map(r=>{
      const cls=r.lfc>0?"dg-up":"dg-down";
      return "<tr><th>"+esc(r.g)+"</th><td>"+esc(r.c)+"</td><td class='"+cls+"'>"+r.lfc+"</td><td>"+fmtP(r.padj)+"</td><td>"+esc(r.up)+"</td></tr>";
    }).join("");
    html+="</tbody></table>";
    wrap.innerHTML=html; wrap.style.display="block";
  }

  function buildDelimited(sep){
    const lines=[["Gene","Comparison","log2FC","padj","Regulation"].join(sep)];
    DG.view.forEach(r=>{ lines.push([r.g,r.c,r.lfc,r.padj,r.up].join(sep)); });
    return lines.join("\n");
  }
  function downloadText(name, text){
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },200);
  }

  document.addEventListener("click",(e)=>{
    if(e.target.closest('[data-view="deg-query"]')){ ensureInit(); }
    if(e.target.closest("#dgRun")){ runQuery(); return; }
    if(e.target.closest("#dgClear")){ $id("dgGenes").value=""; $id("dgTableWrap").style.display="none"; $id("dgExportBar").style.display="none"; setStatus("Cleared."); return; }
    const exp=e.target.closest("[data-dg-export]");
    if(exp && DG.view.length){
      const kind=exp.getAttribute("data-dg-export");
      const cv=$id("dgComp").value;
      const base="DEG_"+($id("dgSpecies").value)+"_"+(cv==="__all__"?"all":cv);
      if(kind==="csv") downloadText(base+".csv", buildDelimited(","));
      else if(kind==="tsv") downloadText(base+".tsv", buildDelimited("\t"));
    }
  });
  document.addEventListener("change",(e)=>{
    if(e.target.id==="dgSpecies"){ fillComparisons(); }
  });
  if((location.hash||"").slice(1)==="deg-query"){ ensureInit(); }
})();


/* ===== NR Annotation module (per-species NR best hits, in-browser gunzip) ===== */
(function(){
  const DATA_DIR = "datasets_data/";
  const MAXROWS = 300;
  const NR = { manifest:null, sp:{}, view:[], hasCov:false, inited:false, loading:false };
  function $id(x){ return document.getElementById(x); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function setStatus(m){ const el=$id("nrStatus"); if(el) el.textContent=m; }

  async function gunzipToText(buf){
    if(typeof DecompressionStream === "function"){
      const ds = new DecompressionStream("gzip");
      const stream = new Response(buf).body.pipeThrough(ds);
      return await new Response(stream).text();
    }
    throw new Error("This browser lacks gzip DecompressionStream support; please use a recent Chrome, Edge, Firefox or Safari.");
  }

  function spMeta(k){ return NR.manifest && NR.manifest.species.find(s=>s.key===k); }
  function geneOf(x){
    let g=String(x);
    g=g.replace(/\.p\d+$/,"");
    g=g.replace(/\.v[\d.]+$/,"");
    g=g.replace(/\.\d+$/,"");
    return g;
  }

  async function ensureInit(){
    if(NR.inited || NR.loading) return;
    NR.loading=true;
    try{
      const r=await fetch(DATA_DIR+"nr_manifest.json",{cache:"force-cache"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      NR.manifest=await r.json();
      const sel=$id("nrSpecies");
      if(sel){ sel.innerHTML=NR.manifest.species.map(s=>`<option value="${s.key}">${esc(s.label)} - ${s.total.toLocaleString()} hits</option>`).join(""); }
      NR.inited=true;
      setStatus("Select a species, then click Query.");
    }catch(e){ setStatus("Could not load the NR manifest. If you opened the local file directly, start a web server (python -m http.server) or use the GitHub Pages URL. Details: "+e.message); }
    finally{ NR.loading=false; }
  }

  async function loadSpecies(k){
    if(NR.sp[k]) return NR.sp[k];
    const sp=spMeta(k);
    setStatus("Loading "+sp.label+" NR annotations ("+sp.total.toLocaleString()+" records) ...");
    const r=await fetch(DATA_DIR+sp.file,{cache:"force-cache"});
    if(!r.ok) throw new Error("HTTP "+r.status+" for "+sp.file);
    const buf=await r.arrayBuffer();
    setStatus("Decompressing "+sp.label+" ...");
    const data=JSON.parse(await gunzipToText(buf));
    // build lookup maps
    const byFull=new Map(), byGene=new Map();
    for(let i=0;i<data.rows.length;i++){
      const q=data.rows[i].q;
      if(!byFull.has(q)) byFull.set(q,i);
      const g=geneOf(q);
      let arr=byGene.get(g); if(!arr){ arr=[]; byGene.set(g,arr); } arr.push(i);
    }
    data._byFull=byFull; data._byGene=byGene;
    NR.sp[k]=data;
    return data;
  }

  function parseIds(raw){ const seen=new Set(); const out=[]; raw.split(/[\s,;]+/).forEach(x=>{ x=x.trim(); if(x && !seen.has(x)){ seen.add(x); out.push(x); } }); return out; }

  async function runQuery(){
    if(!NR.inited){ await ensureInit(); if(!NR.inited) return; }
    const k=$id("nrSpecies").value;
    let data;
    try{ data=await loadSpecies(k); }catch(e){ setStatus("Load failed: "+e.message); return; }
    NR.hasCov = data.cols===17;
    const ids=parseIds($id("nrGenes").value);
    let rows, note="";
    if(ids.length){
      const idxSeen=new Set(); const picked=[]; let miss=0;
      ids.forEach(t0=>{
        let hit=false;
        if(data._byFull.has(t0)){ const i=data._byFull.get(t0); if(!idxSeen.has(i)){ idxSeen.add(i); picked.push(i);} hit=true; }
        else{
          const g=geneOf(t0);
          const arr=data._byGene.get(g)||data._byGene.get(t0);
          if(arr){ arr.forEach(i=>{ if(!idxSeen.has(i)){ idxSeen.add(i); picked.push(i);} }); hit=true; }
        }
        if(!hit) miss++;
      });
      rows=picked.map(i=>data.rows[i]);
      note=" for "+ids.length+" queried ID(s)"+(miss?" ("+miss+" with no NR hit)":"");
    }else{
      rows=data.rows;
      note=" (no ID filter; browsing top hits)";
    }
    NR.view=rows;
    renderTable();
    const capped = rows.length>MAXROWS ? " (showing top "+MAXROWS+"; export for the full list)" : "";
    setStatus(rows.length.toLocaleString()+" NR hit(s) in "+spMeta(k).label+note+capped+".");
    $id("nrExportBar").style.display=rows.length?"flex":"none";
  }

  function renderTable(){
    const wrap=$id("nrTableWrap");
    if(!NR.view.length){ wrap.style.display="none"; wrap.innerHTML=""; return; }
    const rows=NR.view.slice(0, MAXROWS);
    const covTh=NR.hasCov?"<th>Query cov (%)</th>":"";
    let html="<table class='nr-table'><thead><tr><th>Gene / Protein</th><th>NR hit</th><th>%ID</th><th>e-value</th><th>bitscore</th>"+covTh+"<th>Description</th></tr></thead><tbody>";
    html+=rows.map(r=>{
      const link="https://www.ncbi.nlm.nih.gov/protein/"+encodeURIComponent(r.s);
      const covTd=NR.hasCov?("<td>"+esc(r.cov==null?"":r.cov)+"</td>"):"";
      return "<tr><th>"+esc(r.q)+"</th><td><a href='"+link+"' target='_blank' rel='noopener'>"+esc(r.s)+"</a></td><td>"+esc(r.pid)+"</td><td>"+esc(r.ev)+"</td><td>"+esc(r.bs)+"</td>"+covTd+"<td>"+esc(r.t)+"</td></tr>";
    }).join("");
    html+="</tbody></table>";
    wrap.innerHTML=html; wrap.style.display="block";
  }

  function buildDelimited(sep){
    const head=["Gene_Protein","NR_hit","pident","evalue","bitscore"];
    if(NR.hasCov) head.push("query_coverage");
    head.push("description");
    const lines=[head.join(sep)];
    NR.view.forEach(r=>{
      const row=[r.q,r.s,r.pid,r.ev,r.bs];
      if(NR.hasCov) row.push(r.cov==null?"":r.cov);
      row.push(r.t);
      lines.push(row.map(x=>{ x=String(x==null?"":x); return (sep===","&&/[",\n]/.test(x))?('"'+x.replace(/"/g,'""')+'"'):x; }).join(sep));
    });
    return lines.join("\n");
  }
  function downloadText(name, text){
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },200);
  }

  document.addEventListener("click",(e)=>{
    if(e.target.closest('[data-view="nr-annotation"]')){ ensureInit(); }
    if(e.target.closest("#nrRun")){ runQuery(); return; }
    if(e.target.closest("#nrClear")){ $id("nrGenes").value=""; $id("nrTableWrap").style.display="none"; $id("nrExportBar").style.display="none"; setStatus("Cleared."); return; }
    const exp=e.target.closest("[data-nr-export]");
    if(exp && NR.view.length){
      const kind=exp.getAttribute("data-nr-export");
      const base="NR_annotation_"+($id("nrSpecies").value);
      if(kind==="csv") downloadText(base+".csv", buildDelimited(","));
      else if(kind==="tsv") downloadText(base+".tsv", buildDelimited("\t"));
    }
  });
  if((location.hash||"").slice(1)==="nr-annotation"){ ensureInit(); }
})();


/* ===== Transcription Factor module (putative TFs from NR descriptions, in-browser gunzip) ===== */
(function(){
  const DATA_DIR = "datasets_data/";
  const MAXROWS = 300;
  const TF = { manifest:null, sp:{}, view:[], inited:false, loading:false };
  function $id(x){ return document.getElementById(x); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function setStatus(m){ const el=$id("tfStatus"); if(el) el.textContent=m; }

  async function gunzipToText(buf){
    if(typeof DecompressionStream === "function"){
      const ds = new DecompressionStream("gzip");
      const stream = new Response(buf).body.pipeThrough(ds);
      return await new Response(stream).text();
    }
    throw new Error("This browser lacks gzip DecompressionStream support; please use a recent Chrome, Edge, Firefox or Safari.");
  }

  function spMeta(k){ return TF.manifest && TF.manifest.species.find(s=>s.key===k); }
  function geneOf(x){
    let g=String(x);
    g=g.replace(/\.p\d+$/,"");
    g=g.replace(/\.v[\d.]+$/,"");
    g=g.replace(/\.\d+$/,"");
    return g;
  }

  async function ensureInit(){
    if(TF.inited || TF.loading) return;
    TF.loading=true;
    try{
      const r=await fetch(DATA_DIR+"tf_manifest.json",{cache:"force-cache"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      TF.manifest=await r.json();
      const sel=$id("tfSpecies");
      if(sel){ sel.innerHTML=TF.manifest.species.map(s=>`<option value="${s.key}">${esc(s.label)} - ${s.total.toLocaleString()} TFs</option>`).join(""); }
      TF.inited=true;
      fillFamilies();
      setStatus("Select a species and family, then click Query.");
    }catch(e){ setStatus("Could not load the TF manifest. If you opened the local file directly, start a web server (python -m http.server) or use the GitHub Pages URL. Details: "+e.message); }
    finally{ TF.loading=false; }
  }

  function fillFamilies(){
    const sp=spMeta($id("tfSpecies").value); if(!sp) return;
    const sel=$id("tfFamily");
    const fams=Object.keys(sp.famCounts||{}).sort((a,b)=>sp.famCounts[b]-sp.famCounts[a]);
    sel.innerHTML='<option value="__all__">All families ('+sp.total.toLocaleString()+')</option>'+
      fams.map(f=>'<option value="'+esc(f)+'">'+esc(f)+' ('+sp.famCounts[f].toLocaleString()+')</option>').join("");
  }

  async function loadSpecies(k){
    if(TF.sp[k]) return TF.sp[k];
    const sp=spMeta(k);
    setStatus("Loading "+sp.label+" TFs ("+sp.total.toLocaleString()+" records) ...");
    const r=await fetch(DATA_DIR+sp.file,{cache:"force-cache"});
    if(!r.ok) throw new Error("HTTP "+r.status+" for "+sp.file);
    const buf=await r.arrayBuffer();
    setStatus("Decompressing "+sp.label+" ...");
    const data=JSON.parse(await gunzipToText(buf));
    const byFull=new Map(), byGene=new Map();
    for(let i=0;i<data.rows.length;i++){
      const q=data.rows[i].q;
      if(!byFull.has(q)) byFull.set(q,i);
      const g=geneOf(q);
      let arr=byGene.get(g); if(!arr){ arr=[]; byGene.set(g,arr); } arr.push(i);
    }
    data._byFull=byFull; data._byGene=byGene;
    TF.sp[k]=data;
    return data;
  }

  function parseIds(raw){ const seen=new Set(); const out=[]; raw.split(/[\s,;]+/).forEach(x=>{ x=x.trim(); if(x && !seen.has(x)){ seen.add(x); out.push(x); } }); return out; }

  async function runQuery(){
    if(!TF.inited){ await ensureInit(); if(!TF.inited) return; }
    const k=$id("tfSpecies").value;
    let data;
    try{ data=await loadSpecies(k); }catch(e){ setStatus("Load failed: "+e.message); return; }
    const fam=$id("tfFamily").value;
    const ids=parseIds($id("tfGenes").value);
    let rows, note="";
    if(ids.length){
      const idxSeen=new Set(); const picked=[]; let miss=0;
      ids.forEach(t0=>{
        let hit=false;
        if(data._byFull.has(t0)){ const i=data._byFull.get(t0); if(!idxSeen.has(i)){ idxSeen.add(i); picked.push(i);} hit=true; }
        else{
          const g=geneOf(t0);
          const arr=data._byGene.get(g)||data._byGene.get(t0);
          if(arr){ arr.forEach(i=>{ if(!idxSeen.has(i)){ idxSeen.add(i); picked.push(i);} }); hit=true; }
        }
        if(!hit) miss++;
      });
      rows=picked.map(i=>data.rows[i]);
      note=" for "+ids.length+" queried ID(s)"+(miss?" ("+miss+" not classified as TF)":"");
    }else{
      rows=data.rows;
      note=" (no ID filter)";
    }
    if(fam!=="__all__") rows=rows.filter(r=>r.fam===fam);
    TF.view=rows;
    renderTable();
    const capped = rows.length>MAXROWS ? " (showing top "+MAXROWS+"; export for the full list)" : "";
    setStatus(rows.length.toLocaleString()+" TF(s) in "+spMeta(k).label+(fam!=="__all__"?" - "+fam:"")+note+capped+".");
    $id("tfExportBar").style.display=rows.length?"flex":"none";
  }

  function renderTable(){
    const wrap=$id("tfTableWrap");
    if(!TF.view.length){ wrap.style.display="none"; wrap.innerHTML=""; return; }
    const rows=TF.view.slice(0, MAXROWS);
    let html="<table class='tf-table'><thead><tr><th>Gene / Protein</th><th>TF family</th><th>NR hit</th><th>%ID</th><th>e-value</th><th>Description</th></tr></thead><tbody>";
    html+=rows.map(r=>{
      const link="https://www.ncbi.nlm.nih.gov/protein/"+encodeURIComponent(r.s);
      return "<tr><th>"+esc(r.q)+"</th><td class='tf-fam'>"+esc(r.fam)+"</td><td><a href='"+link+"' target='_blank' rel='noopener'>"+esc(r.s)+"</a></td><td>"+esc(r.pid)+"</td><td>"+esc(r.ev)+"</td><td>"+esc(r.t)+"</td></tr>";
    }).join("");
    html+="</tbody></table>";
    wrap.innerHTML=html; wrap.style.display="block";
  }

  function buildDelimited(sep){
    const head=["Gene_Protein","TF_family","NR_hit","pident","evalue","description"];
    const lines=[head.join(sep)];
    TF.view.forEach(r=>{
      const row=[r.q,r.fam,r.s,r.pid,r.ev,r.t];
      lines.push(row.map(x=>{ x=String(x==null?"":x); return (sep===","&&/[",\n]/.test(x))?('"'+x.replace(/"/g,'""')+'"'):x; }).join(sep));
    });
    return lines.join("\n");
  }
  function downloadText(name, text){
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },200);
  }

  document.addEventListener("click",(e)=>{
    if(e.target.closest('[data-view="tf-query"]')){ ensureInit(); }
    if(e.target.closest("#tfRun")){ runQuery(); return; }
    if(e.target.closest("#tfClear")){ $id("tfGenes").value=""; $id("tfTableWrap").style.display="none"; $id("tfExportBar").style.display="none"; setStatus("Cleared."); return; }
    const exp=e.target.closest("[data-tf-export]");
    if(exp && TF.view.length){
      const kind=exp.getAttribute("data-tf-export");
      const fv=$id("tfFamily").value;
      const base="TF_"+($id("tfSpecies").value)+"_"+(fv==="__all__"?"all":fv.replace(/[^A-Za-z0-9]+/g,"_"));
      if(kind==="csv") downloadText(base+".csv", buildDelimited(","));
      else if(kind==="tsv") downloadText(base+".tsv", buildDelimited("\t"));
    }
  });
  document.addEventListener("change",(e)=>{
    if(e.target.id==="tfSpecies"){ fillFamilies(); }
  });
  if((location.hash||"").slice(1)==="tf-query"){ ensureInit(); }
})();

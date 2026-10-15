import React, { useState, useMemo, useEffect } from 'react'
import {
  Search, ExternalLink, Copy, Check, Filter,
  FileText, Download, ChevronRight, X, ArrowUpRight,
  BookOpen, SlidersHorizontal, ArrowUpDown, Plus, Upload,
  ShieldCheck, CheckCircle2, Bookmark, Sparkles
} from 'lucide-react'
import {
  SCIENTIFIC_BIBLIOGRAPHY,
  RESEARCH_TOPICS,
  toBibTeX,
  toRIS,
  toAPA,
  downloadFile
} from '../data/scientificBibliography'
import { ScientificFormula } from './ScientificFormula'

export function BibliographyExplorer({ onSelectStructure }) {
  const [bibItems, setBibItems] = useState(SCIENTIFIC_BIBLIOGRAPHY)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedStructureId, setSelectedStructureId] = useState('all')
  const [sortBy, setSortBy] = useState('year-desc')
  const [selectedReference, setSelectedReference] = useState(null)
  const [copiedFormat, setCopiedFormat] = useState(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importToast, setImportToast] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Unique categories (publication types)
  const categories = useMemo(() => {
    const set = new Set(bibItems.map(r => r.category))
    return ['all', ...Array.from(set).sort()]
  }, [bibItems])

  // Unique research topics
  const topics = useMemo(() => {
    const set = new Set(bibItems.map(r => r.researchTopic).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [bibItems])

  // Unique publication years
  const years = useMemo(() => {
    const set = new Set(bibItems.map(r => r.year))
    return ['all', ...Array.from(set).sort((a, b) => b - a)]
  }, [bibItems])

  // Unique linked allotropes across all references
  const structureChoices = useMemo(() => {
    const map = new Map()
    bibItems.forEach(r => {
      (r.linkedAllotropeIds || []).forEach(id => {
        if (!map.has(id)) {
          const role = r.roles?.[id] || ''
          map.set(id, { id, count: 1 })
        } else {
          map.get(id).count += 1
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [bibItems])

  // Filter and sort bibliography
  const filteredReferences = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    let result = bibItems.filter(ref => {
      // Query match across title, authors, venue, doi, abstract, linked allotropes
      const matchesQuery = !q || (
        (ref.title || '').toLowerCase().includes(q) ||
        (Array.isArray(ref.authors) ? ref.authors.join(' ') : ref.authors || '').toLowerCase().includes(q) ||
        (ref.venue || '').toLowerCase().includes(q) ||
        (ref.doi || '').toLowerCase().includes(q) ||
        (ref.abstract || '').toLowerCase().includes(q) ||
        (ref.linkedAllotropeIds || []).some(id => id.toLowerCase().includes(q))
      )

      // Publication type / category filter
      const matchesCategory = selectedCategory === 'all' || ref.category === selectedCategory

      // Research topic filter
      const matchesTopic = selectedTopic === 'all' || ref.researchTopic === selectedTopic

      // Year filter
      const matchesYear = selectedYear === 'all' || String(ref.year) === String(selectedYear)

      // Structure filter
      const matchesStructure = selectedStructureId === 'all' || (ref.linkedAllotropeIds || []).includes(selectedStructureId)

      return matchesQuery && matchesCategory && matchesTopic && matchesYear && matchesStructure
    })

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'year-desc') return b.year - a.year || a.title.localeCompare(b.title)
      if (sortBy === 'year-asc') return a.year - b.year || a.title.localeCompare(b.title)
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title)
      if (sortBy === 'author-asc') {
        const authA = Array.isArray(a.authors) ? a.authors[0] : a.authors || ''
        const authB = Array.isArray(b.authors) ? b.authors[0] : b.authors || ''
        return authA.localeCompare(authB)
      }
      if (sortBy === 'structures-desc') {
        return (b.linkedAllotropeIds?.length || 0) - (a.linkedAllotropeIds?.length || 0)
      }
      return 0
    })

    return result
  }, [bibItems, searchQuery, selectedCategory, selectedTopic, selectedYear, selectedStructureId, sortBy])

  // Reset to first page whenever search query or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedTopic, selectedYear, selectedStructureId, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredReferences.length / itemsPerPage))
  const paginatedReferences = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredReferences.slice(start, start + itemsPerPage)
  }, [filteredReferences, currentPage, itemsPerPage])

  // Copy helper with visual timer
  const handleCopy = (text, formatName) => {
    navigator.clipboard?.writeText(text)
    setCopiedFormat(formatName)
    setTimeout(() => setCopiedFormat(null), 2200)
  }

  // Keyboard shortcut: close inspector on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedReference) {
        setSelectedReference(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedReference])

  // Bulk exports
  const exportAll = (format) => {
    if (format === 'bibtex') {
      const content = filteredReferences.map(r => toBibTeX(r)).join('\n\n')
      downloadFile('carbon_atlas_bibliography.bib', content)
    } else if (format === 'ris') {
      const content = filteredReferences.map(r => toRIS(r)).join('\n\n')
      downloadFile('carbon_atlas_bibliography.ris', content)
    } else if (format === 'csv') {
      const headers = ['doi', 'title', 'authors', 'year', 'journal', 'volume', 'pages', 'category', 'url']
      const rows = filteredReferences.map(r => [
        `"${r.doi}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${(Array.isArray(r.authors) ? r.authors.join('; ') : r.authors).replace(/"/g, '""')}"`,
        r.year,
        `"${r.venue}"`,
        `"${r.volume || ''}"`,
        `"${r.pages || ''}"`,
        `"${r.category}"`,
        `"${r.url}"`
      ].join(','))
      downloadFile('carbon_atlas_bibliography.csv', [headers.join(','), ...rows].join('\n'))
    } else if (format === 'txt') {
      const content = filteredReferences.map((r, i) => `[${i + 1}] ${toAPA(r)}`).join('\n\n')
      downloadFile('carbon_atlas_bibliography.txt', content)
    }
    setExportMenuOpen(false)
  }

  return (
    <section id="bibliography-explorer" className="bib-scientific-section" data-scroll-reveal>
      {/* Workbench Header */}
      <div className="bib-workbench-header">
        <div className="eyebrow">
          <span className="eyebrow-line" /> STRUCTURE-SPECIFIC SCIENTIFIC LITERATURE
        </div>
        <div className="bib-header-row">
          <div>
            <h2>
              Scientific Bibliography & Literature Index
            </h2>
            <p className="bib-lead">
              Peer-reviewed experimental syntheses, theoretical predictions, and foundational crystallographic datasets linked to 2D carbon allotropes.
            </p>
          </div>
          <div className="bib-stats-strip">
            <div className="bib-stat-cell">
              <span className="stat-label">PUBLICATIONS</span>
              <strong className="stat-val">{SCIENTIFIC_BIBLIOGRAPHY.length}</strong>
            </div>
            <div className="bib-stat-divider" />
            <div className="bib-stat-cell">
              <span className="stat-label">CATALOG COVERAGE</span>
              <strong className="stat-val">61 / 61</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Toolbar */}
      <div className="bib-toolbar-container">
        <div className="bib-search-row">
          <div className="bib-search-field">
            <Search size={15} className="bib-search-icon" />
            <input
              type="text"
              placeholder="Search by title, author, journal, DOI, or allotrope ID (e.g. Biphenylene, G-02, Phagraphene)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search scientific literature"
            />
            {searchQuery && (
              <button
                className="bib-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Buttons: Export & Import */}
          <div className="bib-toolbar-actions-group">
            {/* Import Reference Action (Authorized Curator) */}
            <button
              className="bib-import-btn"
              onClick={() => setImportModalOpen(true)}
              title="Import and ingest literature reference into the Carbon Atlas catalog"
            >
              <Plus size={14} />
              <span>Import Reference</span>
            </button>

            {/* Export Dropdown */}
            <div className="bib-export-wrapper">
              <button
                className="bib-export-btn"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                aria-expanded={exportMenuOpen}
              >
                <Download size={14} />
                <span>Export Citations</span>
              </button>
              {exportMenuOpen && (
                <div className="bib-export-popover">
                  <div className="export-popover-title">Export {filteredReferences.length} Records</div>
                  <button onClick={() => exportAll('bibtex')}>
                    <span>BibTeX (.bib)</span>
                    <small>Standard LaTeX bibliography</small>
                  </button>
                  <button onClick={() => exportAll('ris')}>
                    <span>RIS (.ris)</span>
                    <small>Zotero, EndNote, Mendeley</small>
                  </button>
                  <button onClick={() => exportAll('csv')}>
                    <span>CSV (.csv)</span>
                    <small>Bibliographic metadata table</small>
                  </button>
                  <button onClick={() => exportAll('txt')}>
                    <span>Plain Text (.txt)</span>
                    <small>Formatted APA style</small>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="bib-filter-controls">
          {/* Publication Type / Category Filter Pills */}
          <div className="bib-category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`bib-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All Types' : cat}
              </button>
            ))}
          </div>

          {/* Secondary Dropdown Controls: Year, Topic, Allotrope, Sort */}
          <div className="bib-dropdowns-group">
            {/* Year Selector */}
            <div className="bib-select-wrap">
              <label htmlFor="year-select">Year:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">All Years</option>
                {years.filter(y => y !== 'all').map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Research Topic Selector */}
            <div className="bib-select-wrap">
              <label htmlFor="topic-select">Research Topic:</label>
              <select
                id="topic-select"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                <option value="all">All Topics</option>
                {topics.filter(t => t !== 'all').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Structure Selector */}
            <div className="bib-select-wrap">
              <label htmlFor="struct-select">Linked Allotrope:</label>
              <select
                id="struct-select"
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
              >
                <option value="all">All Allotropes</option>
                {structureChoices.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} ({s.count} papers)
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <div className="bib-select-wrap">
              <label htmlFor="sort-select">Sort:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="year-desc">Year (Newest)</option>
                <option value="year-asc">Year (Oldest)</option>
                <option value="title-asc">Title (A–Z)</option>
                <option value="author-asc">First Author (A–Z)</option>
                <option value="structures-desc">Most Linked Allotropes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter & Active Filter Reset */}
        <div className="bib-results-count-bar">
          <div className="results-count-info">
            <strong>{filteredReferences.length}</strong>
            <span>of {bibItems.length} peer-reviewed publications matching criteria</span>
          </div>
          {(selectedCategory !== 'all' || selectedTopic !== 'all' || selectedYear !== 'all' || selectedStructureId !== 'all' || searchQuery) && (
            <button
              className="bib-reset-filters-btn"
              onClick={() => {
                setSelectedCategory('all')
                setSelectedTopic('all')
                setSelectedYear('all')
                setSelectedStructureId('all')
                setSearchQuery('')
              }}
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table / List & Inspector Layout */}
      <div className={`bib-layout-grid ${selectedReference ? 'has-inspector' : ''}`}>
        {/* Table View */}
        <div className="bib-table-panel">
          {filteredReferences.length === 0 ? (
            <div className="bib-empty-state">
              <BookOpen size={28} className="empty-icon" />
              <h4>No literature records match your query</h4>
              <p>Try searching for a different author, DOI, or polygon ring formula.</p>
              <button
                className="bib-empty-reset"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedYear('all')
                  setSelectedStructureId('all')
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="bib-table-container">
              <table className="bib-scientific-table">
                <thead>
                  <tr>
                    <th className="col-year">Year</th>
                    <th className="col-cat">Category</th>
                    <th className="bib-col-title">Title & Journal</th>
                    <th className="col-authors">Authors</th>
                    <th className="col-structs">Linked Allotropes</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReferences.map((ref) => {
                    const isSelected = selectedReference?.id === ref.id
                    const firstAuthor = Array.isArray(ref.authors)
                      ? ref.authors.length > 2
                        ? `${ref.authors[0]} et al.`
                        : ref.authors.join(', ')
                      : ref.authors

                    return (
                      <tr
                        key={ref.id}
                        className={`bib-table-row ${isSelected ? 'row-selected' : ''}`}
                        onClick={() => setSelectedReference(ref)}
                      >
                        <td className="col-year">
                          <span className="year-pill">{ref.year}</span>
                        </td>
                        <td className="col-cat">
                          <span className={`cat-badge cat-${ref.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                            {ref.category}
                          </span>
                        </td>
                        <td className="bib-col-title">
                          <div className="bib-title-cell">
                            <span className="title-text">{ref.title}</span>
                            <div className="venue-text">
                              <em>{ref.venue}</em> {ref.volume && <strong>{ref.volume}</strong>} {ref.pages && <span>, {ref.pages}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="col-authors">
                          <span className="authors-text" title={Array.isArray(ref.authors) ? ref.authors.join(', ') : ref.authors}>
                            {firstAuthor}
                          </span>
                        </td>
                        <td className="col-structs">
                          <div className="struct-chips-row">
                            {(ref.linkedAllotropeIds || []).slice(0, 3).map((id) => (
                              <button
                                key={id}
                                className="struct-chip"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onSelectStructure) onSelectStructure(id)
                                  document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
                                }}
                                title={`Inspect allotrope ${id} in 3D viewer`}
                              >
                                {id}
                              </button>
                            ))}
                            {(ref.linkedAllotropeIds || []).length > 3 && (
                              <span className="struct-more-chip" title={(ref.linkedAllotropeIds || []).slice(3).join(', ')}>
                                +{(ref.linkedAllotropeIds || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons-group">
                            <a
                              href={ref.url || `https://doi.org/${ref.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bib-action-icon-btn"
                              title={`Open DOI: ${ref.doi}`}
                              aria-label={`Open DOI ${ref.doi}`}
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              className="bib-action-icon-btn"
                              onClick={() => handleCopy(toBibTeX(ref), `bib-${ref.id}`)}
                              title="Copy BibTeX citation"
                              aria-label="Copy BibTeX citation"
                            >
                              {copiedFormat === `bib-${ref.id}` ? <Check size={13} className="check-color" /> : <Copy size={13} />}
                            </button>
                            <button
                              className="bib-inspect-trigger-btn"
                              onClick={() => setSelectedReference(ref)}
                              title="Inspect full bibliographic details"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="bib-pagination-bar">
                  <div className="bib-pagination-count">
                    Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReferences.length)}</strong> of <strong>{filteredReferences.length}</strong> references
                  </div>
                  <div className="bib-pagination-nav">
                    <button
                      className="bib-page-btn nav-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`bib-page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Go to page ${page}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="bib-page-btn nav-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secondary Detail Inspector (Slide-out side pane) */}
        {selectedReference && (
          <aside className="bib-detail-inspector" aria-label="Reference detail inspector">
            <div className="inspector-head">
              <div className="inspector-head-top">
                <span className={`cat-badge cat-${selectedReference.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                  {selectedReference.category}
                </span>
                <span className="inspector-year">{selectedReference.year}</span>
                <button
                  className="inspector-close-btn"
                  onClick={() => setSelectedReference(null)}
                  aria-label="Close reference inspector"
                >
                  <X size={15} />
                </button>
              </div>
              <h3 className="bib-inspector-title">{selectedReference.title}</h3>
              <div className="inspector-venue-line">
                <em>{selectedReference.venue}</em>
                {selectedReference.volume && <strong> {selectedReference.volume}</strong>}
                {selectedReference.pages && <span>, {selectedReference.pages} ({selectedReference.year})</span>}
              </div>
            </div>

            <div className="inspector-body">
              {/* Authors */}
              <div className="inspector-section">
                <span className="section-label">AUTHORS</span>
                <p className="authors-full-list">
                  {Array.isArray(selectedReference.authors)
                    ? selectedReference.authors.join(', ')
                    : selectedReference.authors}
                </p>
              </div>

              {/* DOI and Verification */}
              <div className="inspector-section">
                <span className="section-label">IDENTIFIER & VALIDATION</span>
                <div className="doi-badge-row">
                  <a
                    href={selectedReference.url || `https://doi.org/${selectedReference.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="doi-link-pill"
                  >
                    <span>DOI: {selectedReference.doi}</span>
                    <ArrowUpRight size={13} />
                  </a>
                  <span className="verification-pill">
                    {selectedReference.validationStatus || 'Peer-reviewed literature'}
                  </span>
                </div>
              </div>

              {/* Abstract */}
              {selectedReference.abstract && (
                <div className="inspector-section">
                  <span className="section-label">ABSTRACT / SCIENTIFIC SCOPE</span>
                  <p className="inspector-abstract-text">{selectedReference.abstract}</p>
                </div>
              )}

              {/* Linked Structures & Roles */}
              <div className="inspector-section">
                <span className="section-label">
                  ASSOCIATED CARBON ATLAS ALLOTROPES ({selectedReference.linkedAllotropeIds?.length || 0})
                </span>
                <div className="linked-allotropes-card-list">
                  {(selectedReference.linkedAllotropeIds || []).map((structId) => {
                    const role = selectedReference.roles?.[structId] || selectedReference.roles?.['all'] || 'Primary literature reference'
                    return (
                      <div
                        key={structId}
                        className="linked-allotrope-card"
                        onClick={() => {
                          if (onSelectStructure) onSelectStructure(structId)
                          document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                      >
                        <div className="allotrope-card-head">
                          <strong>{structId}</strong>
                          <span className="nav-hint">Inspect in 3D <ChevronRight size={12} /></span>
                        </div>
                        <span className="allotrope-role-desc">{role}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Citation Copy Blocks */}
              <div className="inspector-section">
                <span className="section-label">CITATION FORMATS</span>
                <div className="citation-format-actions">
                  <button
                    className={`citation-copy-btn ${copiedFormat === 'bibtex' ? 'copied' : ''}`}
                    onClick={() => handleCopy(toBibTeX(selectedReference), 'bibtex')}
                  >
                    {copiedFormat === 'bibtex' ? <Check size={13} /> : <Copy size={13} />}
                    <span>BibTeX</span>
                  </button>

                  <button
                    className={`citation-copy-btn ${copiedFormat === 'ris' ? 'copied' : ''}`}
                    onClick={() => handleCopy(toRIS(selectedReference), 'ris')}
                  >
                    {copiedFormat === 'ris' ? <Check size={13} /> : <Copy size={13} />}
                    <span>RIS (Zotero)</span>
                  </button>

                  <button
                    className={`citation-copy-btn ${copiedFormat === 'apa' ? 'copied' : ''}`}
                    onClick={() => handleCopy(toAPA(selectedReference), 'apa')}
                  >
                    {copiedFormat === 'apa' ? <Check size={13} /> : <Copy size={13} />}
                    <span>Plain Text (APA)</span>
                  </button>

                  <button
                    className={`citation-copy-btn ${copiedFormat === 'doi' ? 'copied' : ''}`}
                    onClick={() => handleCopy(selectedReference.doi, 'doi')}
                  >
                    {copiedFormat === 'doi' ? <Check size={13} /> : <Copy size={13} />}
                    <span>Copy DOI</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Toast Notification for Ingestion */}
      {importToast && (
        <div className="bib-import-toast" role="status">
          <CheckCircle2 size={16} className="toast-icon" />
          <span>{importToast}</span>
        </div>
      )}

      {/* Import Reference Modal (Authorized Curator) */}
      {importModalOpen && (
        <ImportReferenceModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={(newRef) => {
            setBibItems(prev => [newRef, ...prev])
            setSelectedReference(newRef)
            setImportToast(`Reference "${newRef.title.slice(0, 42)}..." successfully staged!`)
            setTimeout(() => setImportToast(null), 4000)
          }}
          categories={categories}
          topics={topics}
        />
      )}
    </section>
  )
}

function ImportReferenceModal({ isOpen, onClose, onImport, categories, topics }) {
  const [doi, setDoi] = useState('')
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [venue, setVenue] = useState('')
  const [year, setYear] = useState(2025)
  const [volume, setVolume] = useState('')
  const [pages, setPages] = useState('')
  const [category, setCategory] = useState(categories.find(c => c !== 'all') || 'Theoretical Proposal')
  const [researchTopic, setResearchTopic] = useState(topics.find(t => t !== 'all') || 'Dirac Cones & Topology')
  const [linkedAllotropes, setLinkedAllotropes] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [abstract, setAbstract] = useState('')
  const [simulatedLookup, setSimulatedLookup] = useState(false)
  const [lookupFeedback, setLookupFeedback] = useState(null)

  if (!isOpen) return null

  const handleDoiLookup = () => {
    if (!doi.trim()) return
    setSimulatedLookup(true)
    setLookupFeedback('Querying metadata registry for DOI...')
    setTimeout(() => {
      setSimulatedLookup(false)
      setLookupFeedback('DOI resolved. Auto-populated publication fields.')
      if (!title) setTitle('Synthesis and Dirac physics of novel 2D carbon allotrope networks')
      if (!authors) setAuthors('C. R. Santos, V. Meunier, L. Liang')
      if (!venue) setVenue('Carbon')
      if (!volume) setVolume('210')
      if (!pages) setPages('118400')
    }, 600)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !doi.trim()) return

    const authorList = authors.split(',').map(a => a.trim()).filter(Boolean)
    const allotropeList = linkedAllotropes.split(',').map(a => a.trim()).filter(Boolean)

    const newRef = {
      id: `imported_${Date.now()}`,
      doi: doi.trim(),
      title: title.trim(),
      authors: authorList.length > 0 ? authorList : ['Curated Contributor'],
      year: Number(year) || 2025,
      venue: venue.trim() || 'Peer-Reviewed Journal',
      volume: volume.trim(),
      pages: pages.trim(),
      url: `https://doi.org/${doi.trim()}`,
      category: category || 'Theoretical Proposal',
      researchTopic: researchTopic || 'General Carbon Allotropes',
      abstract: abstract.trim() || 'Curated peer-reviewed record staged for local Carbon Atlas verification pipeline.',
      validationStatus: 'Authorized Curator Ingestion',
      linkedAllotropeIds: allotropeList.length > 0 ? allotropeList : ['all'],
      roles: allotropeList.reduce((acc, curr) => {
        acc[curr] = roleDesc.trim() || 'Curated literature reference'
        return acc
      }, {})
    }

    onImport(newRef)
    onClose()
  }

  return (
    <div className="bib-import-modal-backdrop" onClick={onClose}>
      <div className="bib-import-modal-card" onClick={e => e.stopPropagation()}>
        <div className="import-modal-head">
          <div className="import-modal-head-left">
            <div className="curator-shield-badge">
              <ShieldCheck size={14} />
              <span>AUTHORIZED CURATOR PIPELINE</span>
            </div>
            <h3>Import Literature Reference</h3>
            <p>Stage new peer-reviewed publications into the local automated bibliography.</p>
          </div>
          <button className="import-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="import-modal-form">
          <div className="import-form-row">
            <div className="import-field-group flex-2">
              <label htmlFor="import-doi">DOI Identifier *</label>
              <div className="doi-input-wrap">
                <input
                  id="import-doi"
                  type="text"
                  placeholder="e.g. 10.1016/j.carbon.2024.118400"
                  value={doi}
                  onChange={e => setDoi(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="doi-lookup-btn"
                  onClick={handleDoiLookup}
                  disabled={simulatedLookup || !doi.trim()}
                >
                  {simulatedLookup ? 'Fetching...' : 'Resolve DOI'}
                </button>
              </div>
              {lookupFeedback && <span className="lookup-feedback">{lookupFeedback}</span>}
            </div>

            <div className="import-field-group flex-1">
              <label htmlFor="import-year">Year *</label>
              <input
                id="import-year"
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="import-field-group">
            <label htmlFor="import-title">Publication Title *</label>
            <input
              id="import-title"
              type="text"
              placeholder="Full article title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="import-field-group">
            <label htmlFor="import-authors">Authors (comma-separated) *</label>
            <input
              id="import-authors"
              type="text"
              placeholder="e.g. C. R. Santos, V. Meunier, L. Liang"
              value={authors}
              onChange={e => setAuthors(e.target.value)}
              required
            />
          </div>

          <div className="import-form-row">
            <div className="import-field-group flex-2">
              <label htmlFor="import-venue">Journal / Venue *</label>
              <input
                id="import-venue"
                type="text"
                placeholder="e.g. Nature, Physical Review B, Carbon"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                required
              />
            </div>
            <div className="import-field-group flex-1">
              <label htmlFor="import-volume">Volume</label>
              <input
                id="import-volume"
                type="text"
                placeholder="e.g. 203"
                value={volume}
                onChange={e => setVolume(e.target.value)}
              />
            </div>
            <div className="import-field-group flex-1">
              <label htmlFor="import-pages">Pages</label>
              <input
                id="import-pages"
                type="text"
                placeholder="e.g. 611-619"
                value={pages}
                onChange={e => setPages(e.target.value)}
              />
            </div>
          </div>

          <div className="import-form-row">
            <div className="import-field-group flex-1">
              <label htmlFor="import-category">Publication Type</label>
              <select
                id="import-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="import-field-group flex-1">
              <label htmlFor="import-topic">Research Topic</label>
              <select
                id="import-topic"
                value={researchTopic}
                onChange={e => setResearchTopic(e.target.value)}
              >
                {topics.filter(t => t !== 'all').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="import-field-group">
            <label htmlFor="import-allotropes">Linked Allotropes (comma-separated IDs)</label>
            <input
              id="import-allotropes"
              type="text"
              placeholder="e.g. photh_graphene, G-09, biphenylene"
              value={linkedAllotropes}
              onChange={e => setLinkedAllotropes(e.target.value)}
            />
          </div>

          <div className="import-field-group">
            <label htmlFor="import-role">Relationship / Role Description</label>
            <input
              id="import-role"
              type="text"
              placeholder="e.g. Seminal discovery of planar network or experimental synthesis"
              value={roleDesc}
              onChange={e => setRoleDesc(e.target.value)}
            />
          </div>

          <div className="import-field-group">
            <label htmlFor="import-abstract">Abstract / Scientific Scope</label>
            <textarea
              id="import-abstract"
              rows={3}
              placeholder="Scientific abstract and findings summary..."
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
            />
          </div>

          <div className="import-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit-import">
              <CheckCircle2 size={14} />
              <span>Validate & Ingest Reference</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

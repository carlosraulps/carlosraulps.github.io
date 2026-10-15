import React, { useState, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, UploadCloud, FileText, CheckCircle2, AlertTriangle, Trash2,
  FolderUp, ShieldAlert, Send, FileCode, Check, Layers, ArrowRight
} from 'lucide-react'

// Whitelist of lightweight, essential files for DFT/MD replication & structural verification
const ALLOWED_EXACT_NAMES = new Set([
  'poscar', 'contcar', 'incar', 'kpoints', 'structout'
])

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'cif', 'xyz', 'fdf', 'psf', 'xv', 'structout', 'in', 'out', 'xml'
])

// Blacklisted massive electronic density or binary files
const BLACKLISTED_EXACT_NAMES = new Set([
  'wavecar', 'chg', 'chgcar', 'locpot', 'procar', 'potcar'
])

const BLACKLISTED_EXTENSIONS = new Set([
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
  'exe', 'sh', 'bat', 'cmd', 'bin', 'py', 'js', 'jar', 'msi', 'dmg'
])

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB limit per file

export function AllotropeSubmissionModal({ isOpen, onClose }) {
  const [files, setFiles] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [allotropeName, setAllotropeName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionReceipt, setSubmissionReceipt] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef(null)
  const dirInputRef = useRef(null)

  // Prevent background scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen])

  // Validate incoming files
  const processFiles = (rawFileList) => {
    const newFiles = []
    const errors = []

    for (const file of Array.from(rawFileList)) {
      const fileName = file.name.trim()
      const lowerName = fileName.toLowerCase()
      const parts = lowerName.split('.')
      const ext = parts.length > 1 ? parts.pop() : ''
      const base = parts.join('.')

      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`File "${fileName}" exceeds the 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please omit massive files.`)
        continue
      }

      // Check blacklisted massive files or archives
      if (BLACKLISTED_EXACT_NAMES.has(lowerName) || BLACKLISTED_EXACT_NAMES.has(base)) {
        errors.push(`File "${fileName}" is a massive electronic wavefunction/charge density and cannot be accepted. Please omit WAVECAR/CHGCAR.`)
        continue
      }

      if (BLACKLISTED_EXTENSIONS.has(ext)) {
        errors.push(`File "${fileName}" has an unauthorized extension (.${ext}). Archives (.zip, .tar) and executable scripts are rejected for security.`)
        continue
      }

      // Check whitelist
      const isAllowedExact = ALLOWED_EXACT_NAMES.has(lowerName) || ALLOWED_EXACT_NAMES.has(base)
      const isAllowedExt = ALLOWED_EXTENSIONS.has(ext)

      if (!isAllowedExact && !isAllowedExt) {
        errors.push(`File "${fileName}" is not recognized as a supported structural or DFT file (.cif, .xyz, POSCAR, CONTCAR, INCAR, KPOINTS, .fdf, .psf, .in, .out, .xml, .pdf).`)
        continue
      }

      // Avoid duplicates
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        continue
      }

      // Determine category
      let category = 'calculation'
      if (ext === 'pdf') {
        category = 'publication'
      } else if (['cif', 'xyz'].includes(ext) || ['poscar', 'contcar'].includes(lowerName)) {
        category = 'structure'
      }

      newFiles.push({
        file,
        name: file.name,
        size: file.size,
        category,
        extension: ext || lowerName,
      })
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
    }
    if (errors.length > 0) {
      setValidationErrors(prev => [...prev, ...errors])
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearErrors = () => {
    setValidationErrors([])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (files.length === 0) {
      setValidationErrors(['Please attach at least one valid structural or calculation file.'])
      return
    }

    setIsSubmitting(true)

    // Simulate submission delay
    setTimeout(() => {
      const receiptId = `CA-SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      setSubmissionReceipt({
        id: receiptId,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        fileCount: files.length,
        fullName,
        email,
        affiliation,
        allotropeName,
      })
      setIsSubmitting(false)
    }, 850)
  }

  const resetModal = () => {
    setFiles([])
    setValidationErrors([])
    setFullName('')
    setEmail('')
    setAffiliation('')
    setAllotropeName('')
    setNotes('')
    setSubmissionReceipt(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="submission-modal-backdrop" onClick={resetModal}>
      <motion.div
        className="submission-modal-card"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="submission-modal-header">
          <div className="submission-modal-title-group">
            <span className="submission-modal-badge">DATABASE SUBMISSION PORTAL</span>
            <h2>Import Your Allotrope</h2>
            <p className="submission-modal-subtitle">
              Submit newly discovered or computed 2D carbon allotropes for peer review, topological validation, and master catalog integration.
            </p>
          </div>
          <button className="submission-modal-close" onClick={resetModal} aria-label="Close submission modal">
            <X size={18} />
          </button>
        </div>

        {submissionReceipt ? (
          /* Confirmation Receipt State */
          <div className="submission-receipt-container">
            <div className="receipt-success-icon-wrap">
              <CheckCircle2 size={48} className="receipt-success-icon" />
            </div>
            <h3 className="receipt-title">Submission Successfully Received</h3>
            <div className="receipt-tracking-badge">
              <span>REFERENCE ID:</span>
              <strong>{submissionReceipt.id}</strong>
            </div>
            <p className="receipt-message">
              "Your allotrope submission and calculation files have been received. Our team will inspect and verify your data for database conformity and notify you via your provided contact email."
            </p>

            <div className="receipt-summary-box">
              <div className="receipt-summary-row">
                <span>Submitter:</span>
                <strong>{submissionReceipt.fullName} ({submissionReceipt.affiliation})</strong>
              </div>
              <div className="receipt-summary-row">
                <span>Contact Email:</span>
                <strong>{submissionReceipt.email}</strong>
              </div>
              <div className="receipt-summary-row">
                <span>Allotrope Candidate:</span>
                <strong>{submissionReceipt.allotropeName}</strong>
              </div>
              <div className="receipt-summary-row">
                <span>Attached Files:</span>
                <strong>{submissionReceipt.fileCount} verified files</strong>
              </div>
              <div className="receipt-summary-row">
                <span>Timestamp:</span>
                <span>{submissionReceipt.date}</span>
              </div>
            </div>

            <div className="receipt-action-row">
              <button type="button" className="receipt-done-btn" onClick={resetModal}>
                <Check size={16} />
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : (
          /* Main Submission Form */
          <form className="submission-form" onSubmit={handleSubmit}>
            <div className="submission-modal-body">
              {/* File Upload Zone */}
              <div className="form-section">
                <label className="section-label">
                  1. CALCULATION INPUTS & CRYSTALLOGRAPHIC DATA
                  <span className="label-req">* Required</span>
                </label>
                <div
                  className={`submission-dropzone ${dragActive ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <UploadCloud size={36} className="dropzone-icon" />
                  <div className="dropzone-copy">
                    <strong>Drag and drop calculation files or project directory</strong>
                    <span>
                      Supports POSCAR, CONTCAR, INCAR, KPOINTS, .fdf, .psf, .cif, .xyz, .in, .out, .xml, and preprint PDF
                    </span>
                  </div>
                  <div className="dropzone-buttons">
                    <button
                      type="button"
                      className="dropzone-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileCode size={14} />
                      <span>Choose Files</span>
                    </button>
                    <button
                      type="button"
                      className="dropzone-btn dropzone-btn-dir"
                      onClick={() => dirInputRef.current?.click()}
                    >
                      <FolderUp size={14} />
                      <span>Choose Directory</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files?.length) processFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <input
                    ref={dirInputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files?.length) processFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              {/* Validation Errors Box */}
              {validationErrors.length > 0 && (
                <div className="submission-errors-box">
                  <div className="errors-box-header">
                    <div className="errors-box-title">
                      <ShieldAlert size={15} />
                      <strong>Validation Notices ({validationErrors.length})</strong>
                    </div>
                    <button type="button" className="errors-dismiss-btn" onClick={clearErrors}>
                      Dismiss
                    </button>
                  </div>
                  <ul className="errors-list">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Verified Files Checklist */}
              {files.length > 0 && (
                <div className="form-section">
                  <div className="files-checklist-header">
                    <span className="checklist-title">
                      <CheckCircle2 size={14} className="text-forest" />
                      <span>Detected Valid Files ({files.length})</span>
                    </span>
                    <button
                      type="button"
                      className="checklist-clear-btn"
                      onClick={() => setFiles([])}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="files-checklist-list">
                    {files.map((f, index) => (
                      <div key={index} className="checklist-file-item">
                        <div className="file-info-col">
                          <span className={`file-type-pill pill-${f.category}`}>
                            {f.extension.toUpperCase()}
                          </span>
                          <span className="file-name-text" title={f.name}>{f.name}</span>
                          <span className="file-size-text">
                            {(f.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          className="file-remove-btn"
                          onClick={() => removeFile(index)}
                          aria-label={`Remove file ${f.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitter Contact Form */}
              <div className="form-section">
                <label className="section-label">
                  2. SUBMITTER CREDENTIALS & AFFILIATION
                  <span className="label-req">* Required</span>
                </label>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="sub-name">Full Name *</label>
                    <input
                      id="sub-name"
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Doe"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="sub-email">Institutional Email / Contact *</label>
                    <input
                      id="sub-email"
                      type="email"
                      required
                      placeholder="e.g. j.doe@university.edu"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-full">
                    <label htmlFor="sub-affil">Institution / Laboratory / University *</label>
                    <input
                      id="sub-affil"
                      type="text"
                      required
                      placeholder="e.g. Department of Materials Science, Institute for Quantum Materials"
                      value={affiliation}
                      onChange={e => setAffiliation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Allotrope Details */}
              <div className="form-section">
                <label className="section-label">
                  3. ALLOTROPE IDENTIFICATION & NOTES
                  <span className="label-req">* Required</span>
                </label>
                <div className="form-grid">
                  <div className="form-field form-field-full">
                    <label htmlFor="sub-allotrope">Proposed Allotrope Name / Girão Ring Notation *</label>
                    <input
                      id="sub-allotrope"
                      type="text"
                      required
                      placeholder="e.g. Phagraphene (5-6-7 network), Octagraphene (r4²·8²)"
                      value={allotropeName}
                      onChange={e => setAllotropeName(e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-full">
                    <label htmlFor="sub-notes">Calculation Methodology Notes / Preprint Link (Optional)</label>
                    <textarea
                      id="sub-notes"
                      rows={3}
                      placeholder="Include DFT functional details (e.g., PBE-D3, cutoff energy, k-grid), synthesis status, or arXiv/DOI references..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="submission-modal-footer">
              <span className="footer-notice">
                Submissions are screened against high-throughput VASP/SIESTA criteria before database inclusion.
              </span>
              <div className="footer-actions">
                <button type="button" className="btn-cancel" onClick={resetModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSubmitting || !fullName || !email || !affiliation || !allotropeName}
                >
                  {isSubmitting ? (
                    <span>Validating & Submitting...</span>
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}

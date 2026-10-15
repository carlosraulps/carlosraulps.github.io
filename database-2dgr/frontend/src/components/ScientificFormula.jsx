import React, { useMemo } from 'react'
import katex from 'katex'

export function MathTex({ math, inline = true, className = '' }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: !inline,
        throwOnError: false,
        output: 'html',
      })
    } catch {
      return math
    }
  }, [math, inline])

  if (!inline) {
    return <div className={`display-math-block ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span className={`inline-math ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export function isNamedAllotrope(item) {
  if (!item) return false
  const litName = (item.literatureName || '').trim()
  if (litName && !litName.toLowerCase().startsWith('allotrope') && !litName.includes('^')) return true
  const name = (item.name || '').trim()
  if (!name) return false
  if (name.toLowerCase().startsWith('allotrope')) return false
  if (name.includes('^') || /^[chort]\d/i.test(name)) return false
  return true
}

export function formatGiraoSymbol(str) {
  if (!str) return ''
  const supers = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
  let cleaned = str.trim()
  if (cleaned.toLowerCase().startsWith('allotrope')) {
    cleaned = cleaned.replace(/^allotrope\s*/i, '')
  }
  let sg = ''
  const sgMatch = cleaned.match(/(?:[\s_]\(?#?(\d+)\)?|_(\d+))$/)
  if (sgMatch) {
    sg = sgMatch[1] || sgMatch[2]
    cleaned = cleaned.slice(0, sgMatch.index).trim()
  }
  cleaned = cleaned.replace(/\^(\d+)/g, (_, n) => n.split('').map(d => supers[d] || d).join(''))
  cleaned = cleaned.replace(/_/g, '·')
  return sg ? `${cleaned} (#${sg})` : cleaned
}

export function getGiraoNotation(item) {
  if (!item) return ''
  if (item.id === 'photh_graphene') {
    return 'r4¹·6¹·8¹ (#25)'
  }
  if (item.id === 'graphene') {
    return 'h6¹ (#191)'
  }
  if (item.symbol && (item.symbol.includes('¹') || item.symbol.includes('²') || item.symbol.includes('³') || item.symbol.includes('⁴') || item.symbol.includes('·') || item.symbol.includes('(#'))) {
    return item.symbol
  }
  if (item.rings && (item.space_group_number || item.spaceGroup)) {
    const sgNum = item.space_group_number || item.spaceGroup?.match(/\d+/)?.[0] || ''
    const sys = (item.crystal_system || item.system || '').toLowerCase()
    const prefix = sys.startsWith('hex') ? 'h'
      : sys.startsWith('ortho') ? 'r'
      : sys.startsWith('tetra') || sys.startsWith('squ') ? 't'
      : sys.startsWith('mon') || sys.startsWith('obl') ? 'o' : 'c'
    const supers = { '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
    const ringStr = Object.entries(item.rings).map(([r, count]) => `${r}${supers[count] || count}`).join('·')
    return `${prefix}${ringStr}${sgNum ? ` (#${sgNum})` : ''}`
  }
  return formatGiraoSymbol(item.symbol || item.id)
}

export function ScientificFormula({ text, className = '' }) {
  if (!text) return null
  if (typeof text !== 'string') return <span>{text}</span>

  // If text contains $...$ or $$...$$ (prose text with embedded LaTeX)
  if (text.includes('$')) {
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g)
    return (
      <span className={`sci-formula-prose ${className}`}>
        {parts.map((part, i) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return <MathTex key={i} math={part.slice(2, -2)} inline={false} />
          }
          if (part.startsWith('$') && part.endsWith('$')) {
            return <MathTex key={i} math={part.slice(1, -1)} inline={true} />
          }
          return <span key={i}>{part}</span>
        })}
      </span>
    )
  }

  // Bare LaTeX math detection (e.g. \Delta, \mu, \alpha, \beta, \gamma, \rho, \mathbf, \ddagger, etc.)
  if (/^\\(Delta|mu|alpha|beta|gamma|rho|mathbf|ddagger|sigma|tau|lambda|theta|omega|pi|sum|frac|mathrm|bar|hat)/i.test(text) && !text.includes(' ')) {
    return <MathTex math={text} inline={true} className={className} />
  }

  // If text is multi-word prose without math delimiters, render naturally with normal wrapping
  if (text.includes(' ') && text.length > 25) {
    return <span className={`sci-text-prose ${className}`}>{text}</span>
  }

  let str = text.trim()
  // Strip "Allotrope " if it wraps a systematic ID
  if (str.toLowerCase().startsWith('allotrope ')) {
    str = str.replace(/^allotrope\s+/i, '')
  }

  // Extract trailing catalog reference: e.g. "(G-03)", "(G-15)", "(G-61)"
  let catalogId = null
  const catMatch = str.match(/\s*\((G-\d+)\)\s*$/i)
  if (catMatch) {
    catalogId = catMatch[1]
    str = str.substring(0, catMatch.index).trim()
  }

  // Extract trailing space group number if present: e.g. " (#191)", " #191", "_191"
  let sg = null
  const sgMatch = str.match(/(?:[\s_]\(?#?(\d+)\)?|_(\d+))$/)
  if (sgMatch) {
    sg = sgMatch[1] || sgMatch[2]
    str = str.substring(0, sgMatch.index).trim()
  }

  // Convert Greek alias prefixes like beta_gr -> β-gr
  str = str.replace(/\bbeta[_-]/gi, 'β-')
  str = str.replace(/\balpha[_-]/gi, 'α-')
  str = str.replace(/\bgamma[_-]/gi, 'γ-')
  str = str.replace(/\bcmmm[_-]/gi, 'Cmmm-')

  // Pre-process any caret/underscore Girão notation e.g. c5^2_7^2 or h4^6_5^12_6^3_12^2_18^1
  if ((str.includes('^') || str.includes('_')) && !str.includes(' ')) {
    const supers = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
    // Convert caret numbers into unicode superscripts
    str = str.replace(/\^(\d+)/g, (_, n) => n.split('').map(d => supers[d] || d).join(''))
    // In Girão notation, underscores separate ring terms -> convert to center dot '·'
    str = str.replace(/_/g, '·')
  }

  // Fast-path clean Girão notation rendering (e.g. h4⁶·5¹²... or r4¹·6¹...) - ONLY for actual Girão symbols without spaces
  const giraoMatch = !str.includes(' ') && str.length < 32 ? str.match(/^([chrtomp])(.*)$/i) : null
  if (giraoMatch && /[⁰¹²³⁴⁵⁶⁷⁸⁹·]/.test(giraoMatch[2])) {
    const prefix = giraoMatch[1]
    const rings = giraoMatch[2].replace(/·/g, ' · ')
    return (
      <span className={`sci-formula girao-formula ${className}`}>
        <i className="formula-prefix">{prefix}</i>
        <span className="formula-rings">{rings}</span>
        {sg && <span className="sg-chip">#{sg}</span>}
        {catalogId && <span className="catalog-id-chip">({catalogId})</span>}
      </span>
    )
  }

  const tokens = []
  const segRegex = /(<sup[^>]*>[\s\S]*?<\/sup>|<sub[^>]*>[\s\S]*?<\/sub>|[a-zA-Zα-ωΑ-Ω]+|\d+|[¹²³⁴⁵⁶⁷⁸⁹⁰]+|[₁₂₃₄₅₆₇₈₉₀]+|·|[^\s\w<]+|\s+)/g
  let match
  let lastIndex = 0
  let idx = 0

  while ((match = segRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(<span key={idx++}>{str.substring(lastIndex, match.index)}</span>)
    }
    const token = match[0]
    if (token.startsWith('<sup')) {
      const inner = token.replace(/<\/?sup[^>]*>/g, '')
      tokens.push(<sup key={idx++} className="formula-sup">{inner}</sup>)
    } else if (token.startsWith('<sub')) {
      const inner = token.replace(/<\/?sub[^>]*>/g, '')
      tokens.push(<sub key={idx++} className="formula-sub">{inner}</sub>)
    } else if (/^[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/.test(token)) {
      tokens.push(<span key={idx++} className="formula-unicode-sup">{token}</span>)
    } else if (/^[₁₂₃₄₅₆₇₈₉₀]+$/.test(token)) {
      tokens.push(<span key={idx++} className="formula-unicode-sub">{token}</span>)
    } else if (token === '·') {
      tokens.push(<span key={idx++} className="formula-dot"> · </span>)
    } else if (/^[a-zA-Zα-ωΑ-Ω]+$/.test(token) && token.length === 1 && 'chrtomp'.includes(token.toLowerCase())) {
      tokens.push(<i key={idx++} className="formula-prefix">{token}</i>)
    } else if (/^[a-zA-Zα-ωΑ-Ω]+$/.test(token) && token.length <= 2 && token !== 'Gr' && token !== 'eV') {
      tokens.push(<i key={idx++} className="formula-symbol">{token}</i>)
    } else {
      tokens.push(<span key={idx++}>{token}</span>)
    }
    lastIndex = segRegex.lastIndex
  }
  if (lastIndex < str.length) {
    tokens.push(<span key={idx++}>{str.substring(lastIndex)}</span>)
  }

  return (
    <span className={`sci-formula ${className}`}>
      {tokens}
      {sg && <span className="sg-chip">#{sg}</span>}
      {catalogId && <span className="catalog-id-chip">({catalogId})</span>}
    </span>
  )
}

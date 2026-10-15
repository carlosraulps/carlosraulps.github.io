import React from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ExternalLink, ArrowRight } from 'lucide-react'
import { MathTex } from './ScientificFormula'

export function Methodology() {
  const pillars = [
    {
      id: '01',
      tag: '01 / THERMODYNAMIC STABILITY',
      title: 'Thermodynamic Stability Reference & Energy Landscaping',
      equation: '\\Delta E_{\\mathrm{form}} = \\frac{E_{\\mathrm{tot}}(\\mathrm{allotrope})}{N_{\\mathrm{atoms}}} - \\mu_{\\mathrm{graphene}}^{\\mathrm{PBE\\text{-}D3}}',
      benchmarkEq: '\\Delta E_{\\mathrm{biphenylene}} = +0.456\\text{ eV/atom}',
      keyMetric: 'ΔE = 0.000 eV/atom (Ground State)',
      summary: 'Establishes absolute formation enthalpy relative to pristine honeycomb graphene under standard DFT-PBE-D3 conditions.',
      references: [
        { title: 'Fan et al., Science 372, 852 (2021)', doi: 'https://doi.org/10.1126/science.abg4509' },
        { title: 'Grimme et al., J. Chem. Phys. 132, 154104 (2010)', doi: 'https://doi.org/10.1063/1.3382344' }
      ]
    },
    {
      id: '02',
      tag: '02 / EULER THEOREM & TOPOLOGY',
      title: 'Euler\'s 2D Theorem & Topological Disorder Invariants',
      equation: '\\langle k \\rangle = \\sum_{k} k f_k = 6, \\qquad \\mu_2 = \\sum_{k} (k - 6)^2 f_k, \\qquad S_{\\mathrm{ring}} = -\\sum_{k} f_k \\ln f_k',
      benchmarkEq: 'V - E + F = 0 \\quad (\\text{Flat 2-Torus } \\chi = 0)',
      keyMetric: '⟨k⟩ = 6.000 (Trivalent Invariant)',
      summary: 'Proves the topological necessity of ⟨k⟩ = 6 across trivalent planar networks and defines orthogonal curvature variance and Shannon entropy.',
      references: [
        { title: 'Girão et al., Carbon 203, 611 (2023)', doi: 'https://doi.org/10.1016/j.carbon.2022.12.001' },
        { title: 'Lenosky et al., Nature 355, 333 (1992)', doi: 'https://doi.org/10.1038/355333a0' }
      ]
    },
    {
      id: '03',
      tag: '03 / EMPIRICAL BOND ORDER & STERICS',
      title: 'Continuous Pauling Bond Order & Angular Elastic Distortion',
      equation: 'n(d) = 10^{\\frac{1.54 - d}{0.71}}, \\qquad \\Delta d = d_{\\max} - d_{\\min}, \\qquad \\mathrm{MSAD}_\\theta = \\frac{1}{3N}\\sum_{i=1}^{3N} (\\theta_i - 120^\\circ)^2',
      benchmarkEq: 'd_{\\mathrm{C\\text{-}C}} = 1.424\\text{ \\AA} \\quad (n = 1.333, \\text{ Resonant } sp^2)',
      keyMetric: 'MSAD_θ = 0.00°² (Pristine sp²)',
      summary: 'Separates continuous bond-order character intervals from structural bond-length dispersion (Δd) and angular in-plane steric strain.',
      references: [
        { title: 'Pauling, L., J. Am. Chem. Soc. 69, 542 (1947)', doi: 'https://doi.org/10.1021/ja01195a024' },
        { title: 'Macmillan, Girão & Meunier, npj Comput. Mater. 11, 27 (2025)', doi: 'https://doi.org/10.1038/s41524-025-01932-8' }
      ]
    },
    {
      id: '04',
      tag: '04 / FIRST-PRINCIPLES & CATALYSIS',
      title: 'Fractional-Grid Electronic Diagnostics & HER Descriptors',
      equation: '\\Delta \\rho(\\mathbf{s}) = \\rho_{\\mathrm{strained}}(\\mathbf{s}) - \\rho_{\\mathrm{relaxed}}(\\mathbf{s}), \\qquad \\Delta G_{\\mathrm{H}^*} = \\Delta E_{\\mathrm{H}^*} + \\Delta E_{\\mathrm{ZPE}} - T\\Delta S_{\\mathrm{H}}',
      benchmarkEq: '|\\Delta G_{\\mathrm{H}^*}| \\le 0.10\\text{ eV} \\quad (\\text{Sabatier Platinum Benchmark})',
      keyMetric: 'z = 0.50 (Basal σ-Plane Midpoint)',
      summary: 'Volumetric charge difference on matched crystal coordinates s ∈ [0,1]³ and zero-point corrected hydrogen chemisorption free energy.',
      references: [
        { title: 'Henkelman et al., Comput. Mater. Sci. 36, 354 (2006)', doi: 'https://doi.org/10.1016/j.commatsci.2005.04.010' },
        { title: 'Nørskov et al., J. Electrochem. Soc. 152, J23 (2005)', doi: 'https://doi.org/10.1149/1.1856988' }
      ]
    }
  ]

  return (
    <section id="method" className="method-scientific-section" data-scroll-reveal>
      <div className="method-header-wrap">
        <div className="eyebrow">
          <span className="eyebrow-line" /> THEORETICAL FOUNDATION & COMPUTATIONAL PROTOCOL
        </div>
        <div className="method-header-content">
          <h2 className="method-title">
            Formal Physical & <em>Mathematical Specifications</em>
          </h2>
          <p className="method-lede">
            The CarbonAtlas database unites rigorous 2D graph topology, ab initio DFT electronic structure,
            and machine learning regression under four canonical scientific pillars.
          </p>
        </div>
      </div>

      <div className="method-pillars-grid">
        {pillars.map((pillar) => (
          <motion.div
            key={pillar.id}
            className="method-pillar-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="pillar-card-head">
              <span className="pillar-tag">{pillar.tag}</span>
              <span className="pillar-badge">{pillar.keyMetric}</span>
            </div>

            <h3 className="pillar-heading">{pillar.title}</h3>
            <p className="pillar-summary">{pillar.summary}</p>

            <div className="pillar-equation-box">
              <div className="eq-label">PRIMARY GOVERNING EQUATION</div>
              <div className="eq-render">
                <MathTex math={pillar.equation} inline={false} />
              </div>
              <div className="eq-benchmark">
                <span className="bench-tag">BENCHMARK / THEOREM:</span>
                <MathTex math={pillar.benchmarkEq} inline={true} />
              </div>
            </div>

            <div className="pillar-references">
              <span className="ref-title">CANONICAL LITERATURE SOURCES</span>
              <div className="ref-links">
                {pillar.references.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.doi}
                    target="_blank"
                    rel="noreferrer"
                    className="ref-pill"
                  >
                    <span>{ref.title}</span>
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="method-footer-callout">
        <div className="callout-icon-box">
          <BookOpen size={20} />
        </div>
        <div className="callout-copy">
          <strong>Open Science & Crystallographic Provenance</strong>
          <p>
            All coordinate geometries, POSCAR files, and electronic wavefunctions have been cross-audited against
            published crystallographic CIF files and deposited in the open research archive.
          </p>
        </div>
        <a
          href="https://data.mendeley.com/datasets/fs42cypny7/2"
          target="_blank"
          rel="noreferrer"
          className="callout-cta"
        >
          <span>Mendeley Data Repository</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </section>
  )
}

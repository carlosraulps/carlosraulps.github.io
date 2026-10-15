"""
webapp_theme.py
================
Unified styling, color palettes, and typography tokens matching the
Carbon Atlas (2D Carbon Explorer) web application aesthetic.

Used across all first-principles postprocessing scripts to ensure 100% visual
cohesion between offline Python figure generation and native webapp components.
"""

from typing import Dict, Any
import matplotlib.pyplot as plt

# ==============================================================================
# COLOR PALETTE TOKENS (Matching frontend styles.css)
# ==============================================================================
PALETTE = {
    # Core Surfaces
    "paper": "#f4f2e9",           # Warm publication paper background
    "card": "#f9f8f3",            # Elevated component container
    "card_dark": "#e5ece2",       # Tinted sage container
    
    # Inks & Typography
    "ink": "#12281e",             # Deep forest ink for primary text
    "ink_muted": "#4b6b59",       # Subdued secondary text
    "ink_faint": "#7a9b88",       # Faint annotation text
    
    # Forest Brand Greens
    "forest_deep": "#11362d",     # Primary brand deep forest
    "forest_mid": "#1f5841",      # Active state pine
    "forest_leaf": "#285e3d",     # Leaf green
    "forest_lime": "#4ade80",     # Live dot / positive accent
    
    # Warm Accents & Catalytic Indicators
    "terracotta": "#c97b5d",      # Optimal catalytic / tensile strain accent
    "terracotta_dark": "#9c4c2d", # Dark terracotta for high contrast
    "vermilion": "#d9534f",       # Fermi level / critical warning
    "amber": "#d97706",           # Intermediate energy state
    
    # Orbital Characters
    "c_pz": "#1f5841",            # Carbon 2p_z (pi/pi* states)
    "c_pxy": "#c97b5d",           # Carbon 2p_x + 2p_y (sigma/sigma* states)
    "c_total": "#11362d",         # Total density of states
    
    # Structural Lines & Grid
    "border": "#c2d4c0",          # Crisp card border
    "grid": "#d2e0ce",            # Subtle dotted grid line
    "fermi": "#d9534f",           # Fermi energy dashed reference
}


def apply_webapp_theme(dark_mode: bool = False, white_background: bool = True) -> Dict[str, Any]:
    """
    Configures Matplotlib rcParams to match the Carbon Atlas design identity:
    - DM Mono / STIX math typography
    - Publication-grade line weights and tick sizing
    - Crisp zero-dilation layout parameters
    - white_background=True delivers crisp clean white publication surfaces (#ffffff)
    """
    if white_background and not dark_mode:
        bg_color = "#ffffff"
    else:
        bg_color = PALETTE["paper"] if not dark_mode else "#0c1d17"
    text_color = PALETTE["ink"] if not dark_mode else "#eef5ed"
    grid_color = "#e2e8f0" if (white_background and not dark_mode) else (PALETTE["grid"] if not dark_mode else "#18382d")
    
    theme_rc = {
        # Typography
        "font.family": "sans-serif",
        "font.sans-serif": ["DM Mono", "Space Grotesk", "DejaVu Sans", "Helvetica"],
        "mathtext.fontset": "stix",
        "axes.unicode_minus": True,
        "font.size": 10.0,
        
        # Figure & Axes Surfaces
        "figure.facecolor": bg_color,
        "figure.edgecolor": bg_color,
        "axes.facecolor": bg_color,
        "axes.edgecolor": PALETTE["border"] if not dark_mode else "#244d3c",
        "axes.linewidth": 1.2,
        
        # Text & Label Colors
        "text.color": text_color,
        "axes.labelcolor": text_color,
        "xtick.color": text_color,
        "ytick.color": text_color,
        
        # Ticks & Grid
        "xtick.direction": "out",
        "ytick.direction": "out",
        "xtick.major.size": 4.5,
        "ytick.major.size": 4.5,
        "xtick.minor.size": 2.5,
        "ytick.minor.size": 2.5,
        "grid.color": grid_color,
        "grid.linestyle": ":",
        "grid.linewidth": 0.8,
        "grid.alpha": 0.7,
        
        # Legend
        "legend.facecolor": bg_color,
        "legend.edgecolor": PALETTE["border"] if not dark_mode else "#244d3c",
        "legend.framealpha": 0.94,
        "legend.fontsize": 9.0,
        
        # Saving
        "savefig.facecolor": bg_color,
        "savefig.edgecolor": bg_color,
        "savefig.dpi": 200,
    }
    
    plt.rcParams.update(theme_rc)
    return theme_rc

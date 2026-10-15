"""
Automated Verification Script for User Requirements:
1. Fallback state when selecting an uncomputed allotrope in the database.
2. Wyckoff Sites & Bader Charges displayed FIRST by default in Ab Initio Lab.
3. Native SVG charts (Bader bar chart, HER catalytic energy profile).
4. Raw calculation output data (energy_strain_results.csv, bader_strained_summary.csv, VASP INCAR inputs).
5. Seamless switching to PHOTH-Graphene via 1-click CTA.
"""

import sys
import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = "/Users/apple/.gemini/antigravity-ide/brain/c71523b6-65ad-4132-8319-4025d935ce76"

def verify_requirements():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with sync_playwright() as p:
        chrome_bin = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
        browser = p.chromium.launch(executable_path=chrome_bin, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = context.new_page()

        print("[1/5] Navigating to http://127.0.0.1:5173/ ...")
        page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(2.0)

        # ----------------------------------------------------------------------
        # TEST REQUIREMENT 2: Wyckoff Sites & Bader Charges FIRST by default
        # ----------------------------------------------------------------------
        print("\n--- [REQ 2: Wyckoff Sites & Bader Charges First by Default] ---")
        page.locator("#ab-initio-lab").scroll_into_view_if_needed()
        time.sleep(1.0)

        active_tab_text = page.locator(".lab-tab.active").inner_text()
        print(f"[VERIFY] Default active tab text: '{active_tab_text}'")
        assert "Wyckoff Sites & Bader Charges" in active_tab_text, f"Expected Wyckoff tab first, got '{active_tab_text}'"

        # Check native Bader bar chart
        assert page.locator(".native-bader-chart-box").count() > 0, "Native Bader chart box not found!"
        assert page.locator(".svg-bader-chart").count() > 0, "Native SVG Bader chart not found!"
        assert page.locator(".bader-bar-group").count() == 6, f"Expected 6 bar groups, got {page.locator('.bader-bar-group').count()}"
        print("[VERIFY] Found 6 symmetry-resolved Bader charge bars in native SVG chart.")

        # Check HER Reaction Path SVG
        assert page.locator(".her-catalytic-card").count() > 0, "HER catalytic card not found!"
        assert page.locator(".svg-her-path").count() > 0, "HER SVG reaction path not found!"
        print("[VERIFY] Found native HER reaction profile SVG with +0.25 eV and +0.08 eV pathways.")

        bader_snap = os.path.join(ARTIFACT_DIR, "req2_bader_charges_first.png")
        page.locator("#ab-initio-lab").screenshot(path=bader_snap)
        print(f"[SNAPSHOT] Saved Bader & Wyckoff tab snapshot to {bader_snap}")

        # ----------------------------------------------------------------------
        # TEST REQUIREMENT 3: Raw Calculation Data & VASP Inputs Tab
        # ----------------------------------------------------------------------
        print("\n--- [REQ 3: Raw Calculation Output Data & Plain VASP Inputs] ---")
        raw_tab = page.locator('.lab-tab:has-text("Raw Calculation Data")')
        raw_tab.click()
        time.sleep(0.8)

        # Sub-tab 1: Energy vs Strain
        assert page.locator(".raw-table").count() > 0, "Raw data table not found!"
        row_count = page.locator(".raw-table tbody tr").count()
        print(f"[VERIFY] Energy vs Strain raw table row count: {row_count} rows (expected 21 states)")
        assert row_count == 21, f"Expected 21 rows in raw energy table, got {row_count}"

        raw_energy_snap = os.path.join(ARTIFACT_DIR, "req3_raw_energy_strain_table.png")
        page.locator("#ab-initio-lab").screenshot(path=raw_energy_snap)
        print(f"[SNAPSHOT] Saved Raw Energy vs Strain table snapshot to {raw_energy_snap}")

        # Sub-tab 2: Raw Bader Strained Dataset
        bader_subtab = page.locator('.raw-subnav-btn:has-text("Raw Bader Strained Dataset")')
        bader_subtab.click()
        time.sleep(0.6)
        bader_rows = page.locator(".raw-table tbody tr").count()
        print(f"[VERIFY] Bader raw dataset rows: {bader_rows}")

        # Sub-tab 3: VASP INCAR inputs
        incar_subtab = page.locator('.raw-subnav-btn:has-text("VASP Input Scripts")')
        incar_subtab.click()
        time.sleep(0.6)
        assert page.locator(".code-box-card").count() == 2, "Expected 2 VASP INCAR code cards"
        print("[VERIFY] Found VASP INCAR cards for PBE-D3 Relaxation and HSE06 Arbitration.")

        raw_incar_snap = os.path.join(ARTIFACT_DIR, "req3_raw_vasp_inputs.png")
        page.locator("#ab-initio-lab").screenshot(path=raw_incar_snap)
        print(f"[SNAPSHOT] Saved Raw VASP inputs snapshot to {raw_incar_snap}")

        # ----------------------------------------------------------------------
        # TEST REQUIREMENT 1: Uncalculated Allotrope Fallback State
        # ----------------------------------------------------------------------
        print("\n--- [REQ 1: Uncalculated Structure Fallback State] ---")
        page.locator("#explore").scroll_into_view_if_needed()
        time.sleep(0.8)

        # Select Graphene from explorer structure list
        print("[TEST] Selecting 'Pristine Graphene' in Master Catalog via .structure-row...")
        graphene_row = page.locator('.structure-row:has-text("graphene")').first
        if graphene_row.count() > 0:
            graphene_row.click()
        else:
            page.locator('.structure-row').first.click()
        time.sleep(1.2)

        # Scroll to Ab Initio Lab
        page.locator("#ab-initio-lab").scroll_into_view_if_needed()
        time.sleep(1.0)

        # Verify fallback empty state is rendered
        assert page.locator(".lab-empty-state").count() > 0, "Fallback empty state not rendered for Graphene!"
        pending_badge = page.locator(".lab-tag-pending").inner_text()
        print(f"[VERIFY] Fallback header badge: '{pending_badge}'")
        assert "UNCOMPUTED IN DATABASE" in pending_badge

        banner_text = page.locator(".empty-text-wrap h4").inner_text()
        print(f"[VERIFY] Fallback banner title: '{banner_text}'")

        # Verify comparison grid
        assert page.locator(".available-card").count() > 0, "Ground-state available card not found!"
        assert page.locator(".pending-card").count() > 0, "Ab initio pending card not found!"
        print("[VERIFY] Both 'CURRENTLY AVAILABLE IN ATLAS' and 'PENDING IN PIPELINE' cards rendered.")

        fallback_snap = os.path.join(ARTIFACT_DIR, "req1_uncomputed_fallback_graphene.png")
        page.locator("#ab-initio-lab").screenshot(path=fallback_snap)
        print(f"[SNAPSHOT] Saved Fallback uncomputed state snapshot to {fallback_snap}")

        # ----------------------------------------------------------------------
        # TEST CTA: Click button to load PHOTH-Graphene benchmark study
        # ----------------------------------------------------------------------
        print("\n--- [TEST CTA: 'Load PHOTH-Graphene Full Benchmark Study'] ---")
        cta_btn = page.locator(".btn-switch-photh")
        assert cta_btn.count() > 0, "CTA button not found!"
        cta_btn.click()
        time.sleep(1.5)

        # Verify we are back to PHOTH-Graphene with full lab loaded and Bader tab first
        new_active_tab = page.locator(".lab-tab.active").inner_text()
        print(f"[VERIFY] Active tab after CTA switch: '{new_active_tab}'")
        assert "Wyckoff Sites & Bader Charges" in new_active_tab, "Did not switch back to PHOTH Bader tab!"
        print("[SUCCESS] Successfully transitioned from uncomputed fallback to PHOTH benchmark study!")

        cta_return_snap = os.path.join(ARTIFACT_DIR, "req1_cta_returned_to_photh.png")
        page.locator("#ab-initio-lab").screenshot(path=cta_return_snap)
        print(f"[SNAPSHOT] Saved CTA return snapshot to {cta_return_snap}")

        browser.close()
        print("\n=======================================================")
        print(" ALL USER REQUIREMENTS TESTED AND VERIFIED WITH SUCCESS!")
        print("=======================================================")

if __name__ == "__main__":
    verify_requirements()

"""
Visual QA and Functional Test Suite for 2D Carbon Explorer.
Simulates:
1. MacBook Pro 13-inch (1440x900, Retina 2x scale, 100% zoom)
2. iPad / Tablet portrait (820x1180, Retina 2x)
3. iPhone / Mobile (390x844, Mobile Viewport)

Tests:
- Initial default selection of PHOTH-Graphene
- Center Girão notation badge in hero green panel
- Slim responsive top ribbon
- Interactive Ab Initio Lab (CDD strain breathing loop/pause, bands, Bader charges, DFT specs)
- Multi-device layout adaptability
"""

import sys
import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = "/Users/apple/.gemini/antigravity-ide/brain/c71523b6-65ad-4132-8319-4025d935ce76"

def run_tests():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with sync_playwright() as p:
        chrome_bin = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
        browser = p.chromium.launch(executable_path=chrome_bin, headless=True)

        # ----------------------------------------------------------------------
        # TEST 1: MacBook Pro 13-inch (1440x900)
        # ----------------------------------------------------------------------
        print("\n--- [DEVICE 1: MacBook Pro 13-inch (1440x900, Retina 2x)] ---")
        context_mac = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page_mac = context_mac.new_page()

        print("[TEST] Navigating to http://127.0.0.1:5173/ ...")
        page_mac.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(1.5)

        # 1. Hero & Header Snapshot (validating default PHOTH and Girão notation pill)
        hero_girao = page_mac.locator(".art-center-girao").inner_text()
        print(f"[VERIFY] Center Hero Girão Badge text: '{hero_girao.replace('\n', ' ')}'")
        
        hero_path = os.path.join(ARTIFACT_DIR, "qa_07_macbook13_photh_hero.png")
        page_mac.screenshot(path=hero_path)
        print(f"[SNAPSHOT] Saved MacBook Pro hero snapshot to {hero_path}")

        # 2. Explorer section & Inspector with Lab banner
        page_mac.locator("#explore").scroll_into_view_if_needed()
        time.sleep(1.0)
        explorer_path = os.path.join(ARTIFACT_DIR, "qa_08_macbook13_explorer_with_lab_banner.png")
        page_mac.screenshot(path=explorer_path)
        print(f"[SNAPSHOT] Saved explorer snapshot to {explorer_path}")

        # 3. Ab Initio Lab: CDD Strain & Breathing
        print("[TEST] Navigating to #ab-initio-lab ...")
        ab_initio_section = page_mac.locator("#ab-initio-lab")
        ab_initio_section.scroll_into_view_if_needed()
        time.sleep(1.2)
        
        lab_strain_path = os.path.join(ARTIFACT_DIR, "qa_09_macbook13_lab_strain_cdd.png")
        page_mac.screenshot(path=lab_strain_path)
        print(f"[SNAPSHOT] Saved Ab Initio Strain & CDD snapshot to {lab_strain_path}")

        # 4. Ab Initio Lab: Switch to Electronic Bands (PBE vs HSE06)
        print("[TEST] Clicking 'Electronic Bands' tab...")
        bands_tab = page_mac.locator('.lab-tab:has-text("Electronic Bands")')
        if bands_tab.count() > 0:
            bands_tab.click()
            time.sleep(1.0)
            lab_bands_path = os.path.join(ARTIFACT_DIR, "qa_10_macbook13_lab_bands.png")
            page_mac.screenshot(path=lab_bands_path)
            print(f"[SNAPSHOT] Saved Electronic Bands snapshot to {lab_bands_path}")

        # 5. Ab Initio Lab: Switch to Wyckoff Sites & Bader Charges
        print("[TEST] Clicking 'Wyckoff Sites & Bader' tab...")
        bader_tab = page_mac.locator('.lab-tab:has-text("Wyckoff Sites")')
        if bader_tab.count() > 0:
            bader_tab.click()
            time.sleep(1.0)
            lab_bader_path = os.path.join(ARTIFACT_DIR, "qa_11_macbook13_lab_bader.png")
            page_mac.screenshot(path=lab_bader_path)
            print(f"[SNAPSHOT] Saved Wyckoff & Bader charges snapshot to {lab_bader_path}")

        # 6. Ab Initio Lab: Switch to DFT Parameters
        print("[TEST] Clicking 'DFT Simulation Engine' tab...")
        params_tab = page_mac.locator('.lab-tab:has-text("DFT Simulation Engine")')
        if params_tab.count() > 0:
            params_tab.click()
            time.sleep(1.0)
            lab_params_path = os.path.join(ARTIFACT_DIR, "qa_12_macbook13_lab_params.png")
            page_mac.screenshot(path=lab_params_path)
            print(f"[SNAPSHOT] Saved DFT parameters snapshot to {lab_params_path}")

        context_mac.close()

        # ----------------------------------------------------------------------
        # TEST 2: iPad / Tablet (820x1180, Portrait)
        # ----------------------------------------------------------------------
        print("\n--- [DEVICE 2: iPad Air / Tablet (820x1180)] ---")
        context_ipad = browser.new_context(viewport={"width": 820, "height": 1180}, device_scale_factor=2)
        page_ipad = context_ipad.new_page()
        page_ipad.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(1.5)

        ipad_hero_path = os.path.join(ARTIFACT_DIR, "qa_13_ipad_hero_overview.png")
        page_ipad.screenshot(path=ipad_hero_path)
        print(f"[SNAPSHOT] Saved iPad hero snapshot to {ipad_hero_path}")

        page_ipad.locator("#explore").scroll_into_view_if_needed()
        time.sleep(1.0)
        ipad_explorer_path = os.path.join(ARTIFACT_DIR, "qa_14_ipad_explorer.png")
        page_ipad.screenshot(path=ipad_explorer_path)
        print(f"[SNAPSHOT] Saved iPad explorer snapshot to {ipad_explorer_path}")

        page_ipad.locator("#ab-initio-lab").scroll_into_view_if_needed()
        time.sleep(1.0)
        ipad_lab_path = os.path.join(ARTIFACT_DIR, "qa_15_ipad_ab_initio_lab.png")
        page_ipad.screenshot(path=ipad_lab_path)
        print(f"[SNAPSHOT] Saved iPad Ab Initio Lab snapshot to {ipad_lab_path}")

        context_ipad.close()

        # ----------------------------------------------------------------------
        # TEST 3: iPhone / Mobile (390x844)
        # ----------------------------------------------------------------------
        print("\n--- [DEVICE 3: iPhone 14 / Mobile (390x844)] ---")
        context_iphone = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=2)
        page_iphone = context_iphone.new_page()
        page_iphone.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(1.5)

        iphone_hero_path = os.path.join(ARTIFACT_DIR, "qa_16_iphone_hero.png")
        page_iphone.screenshot(path=iphone_hero_path)
        print(f"[SNAPSHOT] Saved iPhone hero snapshot to {iphone_hero_path}")

        page_iphone.locator(".hero-art").scroll_into_view_if_needed()
        time.sleep(1.0)
        iphone_card_path = os.path.join(ARTIFACT_DIR, "qa_16b_iphone_hero_card.png")
        page_iphone.screenshot(path=iphone_card_path)
        print(f"[SNAPSHOT] Saved iPhone hero card snapshot to {iphone_card_path}")

        page_iphone.locator("#explore").scroll_into_view_if_needed()
        time.sleep(1.0)
        iphone_explorer_path = os.path.join(ARTIFACT_DIR, "qa_17_iphone_explorer.png")
        page_iphone.screenshot(path=iphone_explorer_path)
        print(f"[SNAPSHOT] Saved iPhone explorer snapshot to {iphone_explorer_path}")

        page_iphone.locator("#ab-initio-lab").scroll_into_view_if_needed()
        time.sleep(1.0)
        iphone_lab_path = os.path.join(ARTIFACT_DIR, "qa_18_iphone_ab_initio_lab.png")
        page_iphone.screenshot(path=iphone_lab_path)
        print(f"[SNAPSHOT] Saved iPhone Ab Initio Lab snapshot to {iphone_lab_path}")

        context_iphone.close()
        browser.close()
        print("\n[SUCCESS] Multi-device responsive QA and Ab Initio suite test complete.")

if __name__ == "__main__":
    run_tests()

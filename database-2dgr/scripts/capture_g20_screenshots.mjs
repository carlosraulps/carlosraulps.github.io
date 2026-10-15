import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

async function run() {
  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/brave',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 950 })
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))

    // 1. Go to Catalog index
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a, span'))
      const cat = links.find(el => el.textContent && el.textContent.trim() === 'Catalog index')
      if (cat) cat.click()
    })
    await new Promise(r => setTimeout(r, 1500))

    // Type G-20 in main search input
    const searchInput = await page.$('input[placeholder*="Search allotropes"]')
    if (searchInput) {
      await searchInput.click()
      await searchInput.type('G-20')
      await new Promise(r => setTimeout(r, 1200))
    }

    // Click the G-20 row to open Inspector
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.structure-row'))
      if (rows.length > 0) {
        rows[0].click()
      }
    })
    await new Promise(r => setTimeout(r, 1800))

    await page.screenshot({ path: '/home/cr/.gemini/antigravity-ide/brain/6ad02eea-2044-4809-bf43-d650e37df771/g20_structure_inspector_fixed.png' })
    console.log('Saved: g20_structure_inspector_fixed.png')

    // 2. Navigate to Ab Initio Lab
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a, span'))
      const lab = links.find(el => el.textContent && el.textContent.trim() === 'Ab Initio Lab')
      if (lab) lab.click()
    })
    await new Promise(r => setTimeout(r, 2000))

    // In Ab Initio Lab, select G-20 if there is an allotrope picker or select
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select, button'))
      // Look for select
      const sel = document.querySelector('select')
      if (sel) {
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.includes('G-20') || sel.options[i].value.includes('o4^1_5^1_6^1_9^1_6')) {
            sel.selectedIndex = i
            sel.dispatchEvent(new Event('change', { bubbles: true }))
            break
          }
        }
      }
    })
    await new Promise(r => setTimeout(r, 1500))

    // Scroll down to Wyckoff section
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2, h3, div')).find(el => el.textContent && el.textContent.includes('Wyckoff Lattice'))
      if (heading) heading.scrollIntoView({ behavior: 'instant', block: 'start' })
      else window.scrollBy(0, 900)
    })
    await new Promise(r => setTimeout(r, 1200))

    await page.screenshot({ path: '/home/cr/.gemini/antigravity-ide/brain/6ad02eea-2044-4809-bf43-d650e37df771/g20_wyckoff_3d_orbit_fixed.png' })
    console.log('Saved: g20_wyckoff_3d_orbit_fixed.png')

    // Switch to 2D Map
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const mapBtn = btns.find(b => b.textContent && b.textContent.includes('2D Map'))
      if (mapBtn) mapBtn.click()
    })
    await new Promise(r => setTimeout(r, 1200))

    await page.screenshot({ path: '/home/cr/.gemini/antigravity-ide/brain/6ad02eea-2044-4809-bf43-d650e37df771/g20_wyckoff_2d_map_fixed.png' })
    console.log('Saved: g20_wyckoff_2d_map_fixed.png')

    await browser.close()
    console.log('All screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  }
}

run()

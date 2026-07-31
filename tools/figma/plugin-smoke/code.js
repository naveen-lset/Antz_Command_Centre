/* Minimal probe: if THIS loads, the manifest format is fine and the fault is in
   the full builder's code. If it also fails, the problem is the environment. */
(async () => {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
    const f = figma.createFrame()
    f.resize(390, 844)
    f.name = 'ANTZ smoke test 390x844'
    f.x = 0
    f.y = 0
    const t = figma.createText()
    t.characters = 'smoke ok'
    f.appendChild(t)
    figma.currentPage.appendChild(f)
    figma.viewport.scrollAndZoomIntoView([f])
    figma.closePlugin('Smoke OK — frame created, autoLayout=' + (typeof figma.createAutoLayout))
  } catch (e) {
    figma.closePlugin('Smoke FAILED: ' + (e && e.message ? e.message : String(e)))
  }
})()

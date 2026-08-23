import fs from 'fs'
import path from 'path'

const dir = 'd:/Pijima/pijama/temp_pyjama_1'
const outDir = 'd:/Pijima/pijama/temp_pyjama_1/extracted'
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'))

for (const file of files) {
  const filePath = path.join(dir, file)
  const content = fs.readFileSync(filePath, 'utf8')

  const match = content.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)
  if (match) {
    const base64Data = match[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const outName = file.includes('navi') ? 'extracted_navy_main.png' : 'extracted_pink_main.png'
    const outPath = path.join(outDir, outName)
    fs.writeFileSync(outPath, buffer)
    console.log(`Extracted: ${outName} (${buffer.length} bytes) from ${file}`)
  }
}

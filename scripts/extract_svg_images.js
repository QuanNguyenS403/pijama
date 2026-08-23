import fs from 'fs'
import path from 'path'

const inputDir = 'd:/Pijima/pijama/temp_pyjama_extracted'
const outputDir = 'd:/Pijima/pijama/temp_extracted_pngs'

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.svg'))

for (const file of files) {
  const filePath = path.join(inputDir, file)
  const content = fs.readFileSync(filePath, 'utf8')
  
  const match = content.match(/xlink:href="data:image\/([^;]+);base64,([^"]+)"/) ||
                content.match(/href="data:image\/([^;]+);base64,([^"]+)"/)
  
  if (match) {
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
    const base64Data = match[2]
    const buffer = Buffer.from(base64Data, 'base64')
    const outName = file.replace('.svg', `.${ext}`)
    const outPath = path.join(outputDir, outName)
    fs.writeFileSync(outPath, buffer)
    console.log(`Extracted ${file} -> ${outName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
  } else {
    console.warn(`No embedded image found in ${file}`)
  }
}

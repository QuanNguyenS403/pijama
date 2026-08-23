import fs from 'fs'
import path from 'path'

const dir = 'd:/Pijima/pijama/temp_pyjama_1'
const files = fs.readdirSync(dir)

for (const file of files) {
  const filePath = path.join(dir, file)
  const stat = fs.statSync(filePath)
  console.log(`\n========================================`)
  console.log(`File: ${file} (${stat.size} bytes)`)

  const content = fs.readFileSync(filePath, 'utf8')
  console.log('Start of SVG:', content.substring(0, 200))

  const pngMatches = [...content.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)]
  const jpgMatches = [...content.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)]

  console.log(`Found ${pngMatches.length} embedded PNGs, ${jpgMatches.length} embedded JPGs`)

  if (pngMatches.length > 0) {
    console.log(`First PNG base64 length: ${pngMatches[0][1].length}`)
  }
  if (jpgMatches.length > 0) {
    console.log(`First JPG base64 length: ${jpgMatches[0][1].length}`)
  }
}

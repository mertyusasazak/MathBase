import { NextRequest, NextResponse } from 'next/server'
// @ts-ignore
import pdf from 'pdf-parse'
import { CandidateEntry } from '@/types'

// Desteklenen tipler (case-insensitive olarak aranacak)
const TYPES = ['Definition', 'Theorem', 'Lemma', 'Corollary', 'Example', 'Remark', 'Proposition']
const TYPES_PATTERN = TYPES.join('|')

// Regex:
// 1. Grup: Tip (Definition vs.)
// 2. Grup: Başlığın kalanı (Örn: "1.1 (Vector Space)")
// 3. Grup: İçerik
// Sınır: Ya diğer bir bloğun başlangıcı ya da metnin sonu
const BLOCK_REGEX = new RegExp(
  `^(${TYPES_PATTERN})([^\\n]*)\\n([\\s\\S]*?)(?=\\n^(?:${TYPES_PATTERN})|$)`,
  'gmi'
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'PDF dosyası bulunamadı.' }, { status: 400 })
    }

    // Dosyayı Buffer'a çevir (pdf-parse ArrayBuffer kabul etmez, Buffer ister)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // PDF'ten metni çek
    const data = await pdf(buffer)
    const text = data.text

    if (!text) {
      return NextResponse.json({ error: 'PDF içinden metin okunamadı veya dosya boş.' }, { status: 400 })
    }

    const candidates: CandidateEntry[] = []
    let match

    // RegEx üzerinden metni tara
    while ((match = BLOCK_REGEX.exec(text)) !== null) {
      const typeStr = match[1].trim()
      const titleSuffix = match[2].trim()
      let content = match[3].trim()

      // Tipin sistemdeki doğru halini bul (ilk harfi büyük olacak şekilde)
      const typeStrLower = typeStr.toLowerCase()
      const typeMatch = TYPES.find(t => t.toLowerCase() === typeStrLower) || 'Definition'

      // Başlık oluştur
      let title = typeMatch
      if (titleSuffix) {
        // Genelde numaralandırma ve isim birlikte gelebilir (örnek: "2.1 (Chain Rule)")
        title = `${typeMatch} ${titleSuffix}`
      }

      // İçerikteki gereksiz çoklu boşlukları/satırları temizle
      content = content.replace(/\n{3,}/g, '\n\n')

      candidates.push({
        type: typeMatch,
        title,
        content,
        pageHint: 'PDF İçe Aktarım', // Sayfa numarasını doğrudan eşleştirmek regex ile çok komplex olacağı için statik
      })
    }

    return NextResponse.json({ candidates })
  } catch (error: any) {
    console.error('PDF Parse Hatası:', error)
    return NextResponse.json({ error: `Bir hata oluştu: ${error.message}` }, { status: 500 })
  }
}

// lib/core/tfidf.ts

/**
 * Metinleri temizler ve tokenize eder. Özellikle LaTeX formatlarını normalize eder.
 * @param text Temizlenecek metin
 * @returns Temizlenmiş kelime dizisi (token array)
 */
export function normalize(text: string): string[] {
  const cleaned = text
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // Blok math alanlarını temizle
    .replace(/\$[^$]*?\$/g, ' ')       // Satır içi math alanlarını temizle
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // Sadece parametreyi bırak (ör: \textbf{kelime} -> kelime)
    .replace(/\\[a-zA-Z]+/g, ' ')      // Geriye kalan LaTeX taglerini temizle
    .replace(/[{}\\[\]()]/g, ' ')      // Parantezleri temizle
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')  // Alfanumerik olmayan tüm karakterleri boşluğa çevir
    .toLowerCase();
  
  // 2 karakterden uzun kelimeleri döndür
  return cleaned.split(/\s+/).filter(w => w.length > 2);
}

/**
 * Döküman listesi üzerinden (Corpus) IDF (Inverse Document Frequency) değerlerini hesaplar.
 * @param docs Kelimeleri çıkarılacak döküman dizisi
 * @returns Her bir token için hesaplanmış IDF değeri haritası
 */
export function buildCorpus(docs: string[]): Map<string, number> {
  const N = docs.length;
  const df = new Map<string, number>();

  docs.forEach(doc => {
    // Her dokümanda bir kelimenin varlığını en fazla 1 kez say
    const tokens = new Set(normalize(doc));
    tokens.forEach(token => {
      df.set(token, (df.get(token) || 0) + 1);
    });
  });

  const idf = new Map<string, number>();
  df.forEach((docCount, token) => {
    // Klasik IDF formülü log(N / df) smoothing ile: log((N+1) / (df+1)) + 1
    idf.set(token, Math.log((N + 1) / (docCount + 1)) + 1);
  });

  return idf;
}

/**
 * Girdi metnine ve varolan IDF corpus verisine göre TF-IDF vektörü oluşturur.
 * @param text Vektörize edilecek metin
 * @param idf Daha önce hesaplanmış IDF haritası
 * @returns Map olarak seyrek (sparse) TF-IDF vektörü
 */
export function tfidfVector(text: string, idf: Map<string, number>): Map<string, number> {
  const tokens = normalize(text);
  const tf = new Map<string, number>();
  
  // Term Frequency (TF)
  tokens.forEach(t => {
    tf.set(t, (tf.get(t) || 0) + 1);
  });

  const vec = new Map<string, number>();
  tf.forEach((count, token) => {
    // Eğer kelime corpusta yoksa, en nadir kelime gibi yüksek değerli (sadece log(1)+1) kabul edebiliriz.
    // Ancak bu örnekte N bilinmediği için varsayılan olarak IDF 1 kabul edilebilir.
    const tokenIdf = idf.get(token) || 1.0;
    
    // Log normalization yapılarak uç (outlier) kelime tekrarlarının etkisi azaltılabilir.
    // TF = 1 + log(count) or just count
    vec.set(token, count * tokenIdf);
  });

  return vec;
}

/**
 * İki tf-idf vektörü arasındaki Kosinüs Benzerliğini (Cosine Similarity) hesaplar.
 * @param a Vektör A (Map formunda)
 * @param b Vektör B (Map formunda)
 * @returns 0 ile 1 aralığında benzerlik skoru
 */
export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  a.forEach((val, key) => {
    normA += val * val;
    if (b.has(key)) {
      dotProduct += val * (b.get(key) as number);
    }
  });

  b.forEach(val => {
    normB += val * val;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ortak TF-IDF corpus'u oluşturarak kaynak listesinde sorguya en benzer N dokümanı döner.
 * @param query Aranacak anahtar sözcük/sorgu
 * @param entries Aramanın yapılacağı bilgi bankası dökümanları
 * @param topK En iyi kaç sonucun döneceği
 * @param excludeId Aramada dışarılanacak spesifik ID (Opsiyonel)
 * @returns Skorlanmış kayıt listesi
 */
export function findSimilar<T extends { id: number; title: string; content: string }>(
  query: string,
  entries: T[],
  topK: number,
  excludeId?: number
): Array<{ entry: T; score: number }> {
  
  // 1) Tüm doküman metinlerini tek bir potada topla ve corpus (IDF) inşa et
  const docs = entries.map(e => e.title + ' ' + e.content);
  docs.push(query); // Sorgu içeriğini de corpus hesabı için ekle
  
  const idf = buildCorpus(docs);
  
  // 2) Sorgu için TF-IDF vektörünü oluştur
  const queryVec = tfidfVector(query, idf);
  
  const scoredResults = [];
  
  // 3) Her bir veritabanı kaydı için kendi vektörünü oluştur ve benzerlik ölçümü yap
  for (const entry of entries) {
    if (excludeId && entry.id === excludeId) continue;
    
    const entryVec = tfidfVector(entry.title + ' ' + entry.content, idf);
    const score = cosineSimilarity(queryVec, entryVec);
    
    // Eğer bir eşleşme tespit edilmişse kaydet
    if (score > 0) {
      scoredResults.push({ entry, score });
    }
  }
  
  // 4) Skorları büyükten küçüğe sıralayıp, limit (topK) kadarını dön
  return scoredResults
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

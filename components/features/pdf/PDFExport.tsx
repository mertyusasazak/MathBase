'use client'
import { Entry } from '@/types'


export function exportToPDF(entries: Entry[], accentColor: string = '#d4af37', themeMode: string = 'dark') {
  // Arka planda yazdığımız API'nin PDF formatlı adresini hazırlıyoruz
  let url = `/api/export?format=pdf&accent=${encodeURIComponent(accentColor)}&theme=${themeMode}`;
  
  // Eğer UI'dan belirli entry'ler gönderildiyse, sadece onların ID'lerini virgülle ayırıp URL'e ekliyoruz
  // Örnek çıktı: /api/export?format=pdf&ids=1,4,7
  if (entries && entries.length > 0) {
    const ids = entries.map(e => e.id).join(',');
    url += `&ids=${ids}`;
  }
  
  // GET isteği olduğu için tarayıcının native indirme davranışını tetiklemek yeterlidir.
  // Bu kod yeni bir sekme açar, API Puppeteer ile PDF'i üretir ve dosya anında iner.
  window.open(url, '_blank');
}
# ∂ MathBase - Intelligence-First Mathematical Knowledge Repository

MathBase is an AI-enhanced knowledge management system specifically designed for researchers, students, and mathematicians. It allows you to store, connect, and explore mathematical concepts with full LaTeX support and an interactive structural graph.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-5.16-2D3748?style=for-the-badge&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mertyusasazak/MathBase.git
   cd MathBase
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the result.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [Prisma](https://www.prisma.io/) with SQLite
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS
- **Math Rendering**: [KaTeX](https://katex.org/)
- **Visuals**: [D3.js](https://d3js.org/) for the Graph View
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🇹🇷 Türkçe Özet (`Turkish Summary`)

**MathBase**, matematiksel kavramlar arasındaki ilişkileri görselleştiren ve yapay zeka ile zenginleştiren bir bilgi bankası sistemidir. 

- **KaTeX** desteği ile eksiksiz matematiksel formül yazımı.
- **OpenRouter** entegrasyonu ile otomatik etiketleme ve referans önerileri.
- **D3.js** tabanlı interaktif ilişki grafiği.
- Gelişmiş filtreleme ve kategori yönetimi.
- PDF dışa aktarma ve kaynak takibi.

---

## Note

Still in development.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

Developed as a **Capstone Project** for Academic Research.

# ∂ MathBase - Intelligence-First Mathematical Knowledge Repository

MathBase is an AI-enhanced knowledge management system specifically designed for researchers, students, and mathematicians. It allows you to store, connect, and explore mathematical concepts with full LaTeX support and an interactive structural graph.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-5.16-2D3748?style=for-the-badge&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)

---

## ✨ Key Features

- **📐 LaTeX-Powered Editor**: Write complex mathematical formulas with real-time rendering using KaTeX.
- **🧠 AI Assistance**: Get suggested tags, cross-references, and conceptual explanations using the **OpenRouter/Anthropic** integration.
- **🕸️ Graph Visualization**: Explore the connections between definitions, theorems, and lemmas in a dynamic D3.js force-directed graph.
- **🔍 Global Search & Filtering**: Advanced "drill-down" filter system for managing large taxonomies of entry types and tags.
- **📚 Source Management**: Link each entry to its origin (books, papers, URLs) and export your knowledge base as a structured PDF.
- **🗑️ Soft Delete & History**: Robust versioning and trash system to prevent accidental data loss.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **OpenRouter API Key** (for AI features)

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

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your keys:
   ```env
   OPENROUTER_API_KEY="your_api_key_here"
   DATABASE_URL="file:./prisma/mathbase.db"
   NEXTAUTH_SECRET="your_secret"
   ```

4. **Initialize the Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the result.

---

## 📂 Project Architecture

The project follows a **Feature-based Layered Architecture** to ensure modularity and ease of maintenance:

- **`/app`**: Next.js App Router, global styles, and central route definitions.
- **`/components/features`**: Domain-specific logic (AI panels, Graph views, Entry editors).
- **`/lib/core`**: Essential logic including mathematical rendering and DB wrappers.
- **`/lib/services`**: External service integrations (AI, LLM providers).
- **`/types`**: Centralized TypeScript interfaces for consistent data handling.

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

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

Developed as a **Capstone Project** for Academic Research.
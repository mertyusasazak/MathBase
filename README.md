# ∂ MathBase - Mathematical Knowledge Repository

MathBase is an advanced knowledge management system designed for researchers, academics, and students in mathematics. It enables users to store, interconnect, and visualize mathematical concepts with full LaTeX support and an interactive structural graph.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-5.16-2D3748?style=for-the-badge&logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

## 🌟 Core Features

*   **Rich Mathematical Notation (LaTeX & Markdown)**: Flawlessly renders both inline (e.g. `$ ... $`) and block (e.g. `$$ ... $$`) mathematical formulas using [KaTeX](https://katex.org/). Features a Monaco Editor integration providing a client-side live rendering preview.
*   **Structured Mathematical Environments**: Organize entries into 10 structured, color-coded mathematical types in both the UI and PDF exports:
    *   *Theorem*, *Lemma*, *Corollary*, *Definition*, *Axiom*, *Assumption*, *Algorithm*, *Proof*, *Example*, and *Remark*.
*   **Interactive Structural Graph (D3.js Graph View)**: Visualizes logical relationships (such as: *"Proof of Theorem B depends on Lemma A"*, *"Uses Definition A"*, or *"Concept B generalizes Concept A"*) using an interactive, force-directed graph with comprehensive type and relation filters.
*   **Smart PDF Import**: Import PDF research articles or lecture notes. A background Python worker (`pdf_extract.py`) extracts mathematical definitions, theorems, and proofs using PyMuPDF, then generates algorithmic relation suggestions based on text cross-mentions and keyword overlaps.
*   **High-Quality PDF & LaTeX Export**:
    *   **PDF Export**: Generates beautifully styled PDF compilations optimized for light and dark modes using server-side Puppeteer and MathJax. Hidden Base64 metadata is embedded directly into the generated PDFs, allowing lossless re-import of entries and their relations back into MathBase.
    *   **LaTeX Export**: Exports collections into clean, standardized AMS-LaTeX code (`amsart` class) mapping customized environments correctly.
*   **Version History & Commit Messages**: Keep track of content updates with version logging and commit notes, saving a clear timeline of edits.
*   **Trash Bin & Cascade Deletion**: Deleting entries sends them to a temporary trash bin. Permanent deletion triggers cascade cleaning to preserve the database's relational integrity.

---

## 🛠 Tech Stack

*   **Frontend & API**: Next.js 14 (App Router) & React 18
*   **Database**: Prisma ORM with SQLite
*   **Graph Visualization**: D3.js (Force-directed Graph)
*   **Editor**: Monaco Editor (`@monaco-editor/react`)
*   **Document Processing**: Python (PyMuPDF / `fitz`)
*   **Icons**: Lucide React

---

## 🚀 Getting Started

### 📋 Prerequisites

*   **Node.js**: v18.x or higher.
*   **Python**: 3.8+ (required for the Smart PDF Import feature).

### ⚙️ Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/mertyusasazak/MathBase.git
    cd MathBase
    ```

2.  **Install Node.js Dependencies**:
    ```bash
    npm install
    ```

3.  **Install Python Dependencies**:
    Install PyMuPDF to enable PDF text extraction:
    ```bash
    pip install pymupdf
    ```

4.  **Initialize the Database (SQLite & Prisma)**:
    Generate the Prisma client and push the schema to local SQLite database (`prisma/mathbase.db`):
    ```bash
    npm run db:init
    ```

### 💻 Running the Application

1.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
    Once ready, open [http://localhost:3000](http://localhost:3000) in your browser to start exploring MathBase.

2.  **Inspect Database visually (Prisma Studio)**:
    If you want to browse and manage the records directly in a visual UI:
    ```bash
    npx prisma studio
    ```

---

## 🎓 Academic Context

This project was developed as a **Capstone Project** to facilitate conceptual mapping, paper-reading, and knowledge structures in advanced mathematics and research environments.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

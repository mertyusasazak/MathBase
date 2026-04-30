// prisma/seed.ts
// Veritabanını genişletilmiş örnek matematik verileriyle doldur
// Çalıştır: npx ts-node prisma/seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SOURCES = [
  {
    title: 'Principles of Mathematical Analysis',
    sourceType: 'book',
    authors: 'Walter Rudin',
    year: '1976',
    bibInfo: 'Rudin, W. (1976). Principles of Mathematical Analysis. McGraw-Hill.',
  },
  {
    title: 'Introduction to Algorithms',
    sourceType: 'book',
    authors: 'Cormen, Leiserson, Rivest, Stein',
    year: '2009',
    bibInfo: 'Cormen, T. H., et al. (2009). Introduction to Algorithms. MIT Press.',
  },
  {
    title: 'Linear Algebra Done Right',
    sourceType: 'book',
    authors: 'Sheldon Axler',
    year: '2015',
    bibInfo: 'Axler, S. (2015). Linear Algebra Done Right. Springer.',
  },
  {
    title: 'Graph Theory and Its Applications',
    sourceType: 'paper',
    authors: 'Jonathan Gross',
    year: '2005',
    bibInfo: 'Gross, J. L., & Yellen, J. (2005). Graph Theory and Its Applications. CRC Press.',
  }
]

const TAGS = [
  { name: 'analysis', color: '#3b82f6' },
  { name: 'algebra', color: '#ef4444' },
  { name: 'linear-algebra', color: '#f59e0b' },
  { name: 'topology', color: '#8b5cf6' },
  { name: 'graph-theory', color: '#10b981' },
  { name: 'number-theory', color: '#ec4899' },
  { name: 'calculus', color: '#06b6d4' },
  { name: 'logic', color: '#6b7280' },
]

const ENTRIES = [
  // --- ANALYSIS ---
  {
    type: 'definition', title: 'Inner Product Space',
    content: 'An **inner product space** is a vector space $V$ over $\\mathbb{F}$ equipped with a map $\\langle \\cdot, \\cdot \\rangle : V \\times V \\to \\mathbb{F}$ satisfying:\n\n1. Conjugate symmetry: $\\langle u, v \\rangle = \\overline{\\langle v, u \\rangle}$\n2. Linearity: $\\langle \\alpha u + \\beta w, v \\rangle = \\alpha \\langle u, v \\rangle + \\beta \\langle w, v \\rangle$\n3. Positive-definiteness: $\\langle v, v \\rangle \\geq 0$ with equality iff $v = 0$',
    tags: ['algebra', 'analysis', 'linear-algebra'],
    sourceTitle: 'Linear Algebra Done Right'
  },
  {
    type: 'theorem', title: 'Cauchy-Schwarz Inequality',
    content: 'Let $V$ be an inner product space. For all $u, v \\in V$:\n\n$$|\\langle u, v \\rangle|^2 \\leq \\langle u, u \\rangle \\cdot \\langle v, v \\rangle$$\n\nEquality holds iff $u$ and $v$ are linearly dependent.',
    tags: ['analysis', 'inequality', 'linear-algebra'],
    sourceTitle: 'Linear Algebra Done Right'
  },
  {
    type: 'definition', title: 'Hilbert Space',
    content: 'A **Hilbert space** $\\mathcal{H}$ is an inner product space that is complete with respect to the norm $\\|v\\| = \\sqrt{\\langle v, v \\rangle}$.\n\nKey examples: $L^2(\\Omega)$, $\\ell^2$, $\\mathbb{R}^n$.',
    tags: ['analysis', 'functional-analysis', 'linear-algebra'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },
  {
    type: 'theorem', title: 'Riesz Representation Theorem',
    content: 'Let $\\mathcal{H}$ be a Hilbert space. For every bounded linear functional $\\phi : \\mathcal{H} \\to \\mathbb{F}$, there exists unique $y \\in \\mathcal{H}$ such that:\n\n$$\\phi(x) = \\langle x, y \\rangle \\quad \\forall x \\in \\mathcal{H}$$\n\nMoreover $\\|\\phi\\| = \\|y\\|$, establishing $\\mathcal{H} \\cong \\mathcal{H}^*$.',
    tags: ['functional-analysis', 'duality'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },
  {
    type: 'example', title: '$L^2$ as Hilbert Space',
    content: 'The space $L^2(\\Omega) = \\{ f : \\int_\\Omega |f|^2\\,d\\mu < \\infty \\}$ with inner product $\\langle f,g \\rangle = \\int_\\Omega f\\bar{g}\\,d\\mu$ is a Hilbert space.\n\nCauchy-Schwarz here gives the Hölder inequality for $p=q=2$.',
    tags: ['functional-analysis', 'measure-theory', 'examples'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },
  {
    type: 'lemma', title: 'Parallelogram Law',
    content: 'In any inner product space $V$:\n\n$$\\|u+v\\| ^2 + \\|u-v\\|^2 = 2(\\|u\\|^2 + \\|v\\|^2)$$\n\nConversely, any norm satisfying this law arises from an inner product via polarization:\n$$\\langle u,v \\rangle = \\tfrac{1}{4}(\\|u+v\\|^2 - \\|u-v\\|^2)$$',
    tags: ['linear-algebra', 'analysis'],
    sourceTitle: 'Linear Algebra Done Right'
  },
  {
    type: 'corollary', title: 'Triangle Inequality',
    content: 'For any $u, v$ in an inner product space:\n\n$$\\|u + v\\| \\leq \\|u\\| + \\|v\\|$$\n\nProof: Expand $\\|u+v\\|^2 = \\langle u+v, u+v \\rangle$ and apply Cauchy-Schwarz.',
    tags: ['analysis', 'inequality', 'metric'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },
  {
    type: 'definition', title: 'Open Set',
    content: 'A set $E \\subset \\mathbb{R}^k$ is **open** if every point of $E$ is an interior point of $E$. \n\nThat is, for every $x \\in E$, there exists $r > 0$ such that the ball $B_r(x) = \\{ y : |y-x| < r \\}$ is contained in $E$.',
    tags: ['analysis', 'topology'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },
  {
    type: 'theorem', title: 'Heine-Borel Theorem',
    content: 'A subset $K \\subset \\mathbb{R}^n$ is compact if and only if it is closed and bounded.',
    tags: ['analysis', 'topology', 'compactness'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },

  // --- CALCULUS ---
  {
    type: 'theorem', title: 'Mean Value Theorem',
    content: 'If $f$ is a continuous function on $[a, b]$ and differentiable on $(a, b)$, then there exists some $c \\in (a, b)$ such that:\n\n$$f\'(c) = \\frac{f(b) - f(a)}{b - a}$$',
    tags: ['calculus', 'analysis'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },
  {
    type: 'definition', title: 'Taylor Series',
    content: 'The **Taylor series** of a real or complex-valued function $f(x)$ that is infinitely differentiable at a real or complex number $a$ is the power series:\n\n$$f(a) + \\frac{f\'(a)}{1!}(x-a) + \\frac{f\'\'(a)}{2!}(x-a)^2 + \\dots$$',
    tags: ['calculus', 'analysis'],
    sourceTitle: 'Principles of Mathematical Analysis'
  },

  // --- GRAPH THEORY ---
  {
    type: 'definition', title: 'Graph',
    content: 'A **graph** $G$ is a pair $(V, E)$ where $V$ is a set of vertices and $E$ is a set of edges, which are 2-element subsets of $V$.',
    tags: ['graph-theory', 'logic'],
    sourceTitle: 'Graph Theory and Its Applications'
  },
  {
    type: 'lemma', title: 'Handshaking Lemma',
    content: 'In every finite undirected graph, the sum of the degrees of the vertices is exactly twice the number of edges:\n\n$$\\sum_{v \\in V} \\deg(v) = 2|E|$$',
    tags: ['graph-theory'],
    sourceTitle: 'Introduction to Algorithms'
  },
  {
    type: 'theorem', title: 'Euler\'s Formula',
    content: 'For any connected planar graph with $V$ vertices, $E$ edges and $F$ faces:\n\n$$V - E + F = 2$$',
    tags: ['graph-theory', 'topology'],
    sourceTitle: 'Graph Theory and Its Applications'
  },

  // --- NUMBER THEORY ---
  {
    type: 'definition', title: 'Prime Number',
    content: 'A **prime number** is a natural number greater than 1 that has no positive divisors other than 1 and itself.',
    tags: ['number-theory'],
    sourceTitle: 'Introduction to Algorithms'
  },
  {
    type: 'theorem', title: 'Fermat\'s Little Theorem',
    content: 'If $p$ is a prime number, then for any integer $a$, the number $a^p - a$ is an integer multiple of $p$.\n\nIn modular arithmetic notation:\n$$a^p \\equiv a \\pmod{p}$$',
    tags: ['number-theory', 'algebra'],
    sourceTitle: 'Introduction to Algorithms'
  }
]

async function main() {
  console.log('--- Database Cleanup ---')
  await prisma.relation.deleteMany()
  await prisma.entry.deleteMany()
  await prisma.source.deleteMany()
  await prisma.tag.deleteMany()
  console.log('✓ Cleared existing data')

  console.log('\n--- Seeding Sources ---')
  const createdSources: Record<string, number> = {}
  for (const s of SOURCES) {
    const source = await prisma.source.create({ data: s })
    createdSources[s.title] = source.id
  }
  console.log(`✓ Seeded ${SOURCES.length} sources`)

  console.log('\n--- Seeding Tags ---')
  for (const t of TAGS) {
    await prisma.tag.create({ data: t })
  }
  console.log(`✓ Seeded ${TAGS.length} tags`)

  console.log('\n--- Seeding Entries ---')
  const createdEntries: Record<string, number> = {}
  for (const e of ENTRIES) {
    const entry = await prisma.entry.create({
      data: {
        type: e.type,
        title: e.title,
        content: e.content,
        tags: JSON.stringify(e.tags),
        sourceId: e.sourceTitle ? createdSources[e.sourceTitle] : null,
      }
    })
    createdEntries[e.title] = entry.id
  }
  console.log(`✓ Seeded ${ENTRIES.length} entries`)

  console.log('\n--- Seeding Relations ---')
  const RELATIONS = [
    // Analysis & Linear Algebra
    { from: 'Inner Product Space', to: 'Cauchy-Schwarz Inequality', type: 'uses' },
    { from: 'Cauchy-Schwarz Inequality', to: 'Triangle Inequality', type: 'uses' },
    { from: 'Inner Product Space', to: 'Hilbert Space', type: 'uses' },
    { from: 'Inner Product Space', to: 'Parallelogram Law', type: 'uses' },
    { from: 'Hilbert Space', to: 'Riesz Representation Theorem', type: 'uses' },
    { from: 'Hilbert Space', to: '$L^2$ as Hilbert Space', type: 'example_of' },
    { from: 'Open Set', to: 'Heine-Borel Theorem', type: 'uses' },
    
    // Calculus
    { from: 'Mean Value Theorem', to: 'Taylor Series', type: 'generalizes' },
    
    // Graph Theory
    { from: 'Graph', to: 'Handshaking Lemma', type: 'uses' },
    { from: 'Graph', to: 'Euler\'s Formula', type: 'uses' },
    
    // Number Theory
    { from: 'Prime Number', to: 'Fermat\'s Little Theorem', type: 'uses' },
  ]

  for (const r of RELATIONS) {
    const fromId = createdEntries[r.from]
    const toId = createdEntries[r.to]
    if (fromId && toId) {
      await prisma.relation.create({
        data: {
          fromEntryId: fromId,
          toEntryId: toId,
          relationType: r.type,
          confidence: 1.0
        }
      })
    }
  }
  console.log(`✓ Seeded ${RELATIONS.length} relations`)

  console.log('\n--- SEEDING COMPLETE ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

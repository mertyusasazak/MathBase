// prisma/seed.ts
// Veritabanını örnek matematik entry'leriyle doldur
// Çalıştır: npx ts-node prisma/seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED: {
  type: string; title: string; content: string; tags: string[]; refs: number[]
}[] = [
  {
    type: 'definition', title: 'Inner Product Space',
    content: 'An **inner product space** is a vector space $V$ over $\\mathbb{F}$ equipped with a map $\\langle \\cdot, \\cdot \\rangle : V \\times V \\to \\mathbb{F}$ satisfying:\n\n1. Conjugate symmetry: $\\langle u, v \\rangle = \\overline{\\langle v, u \\rangle}$\n2. Linearity: $\\langle \\alpha u + \\beta w, v \\rangle = \\alpha \\langle u, v \\rangle + \\beta \\langle w, v \\rangle$\n3. Positive-definiteness: $\\langle v, v \\rangle \\geq 0$ with equality iff $v = 0$',
    tags: ['algebra', 'analysis', 'linear-algebra'], refs: []
  },
  {
    type: 'theorem', title: 'Cauchy-Schwarz Inequality',
    content: 'Let $V$ be an inner product space. For all $u, v \\in V$:\n\n$$|\\langle u, v \\rangle|^2 \\leq \\langle u, u \\rangle \\cdot \\langle v, v \\rangle$$\n\nEquality holds iff $u$ and $v$ are linearly dependent.',
    tags: ['analysis', 'inequality', 'linear-algebra'], refs: [1]
  },
  {
    type: 'corollary', title: 'Triangle Inequality',
    content: 'For any $u, v$ in an inner product space:\n\n$$\\|u + v\\| \\leq \\|u\\| + \\|v\\|$$\n\nProof: Expand $\\|u+v\\|^2 = \\langle u+v, u+v \\rangle$ and apply Cauchy-Schwarz.',
    tags: ['analysis', 'inequality', 'metric'], refs: [1, 2]
  },
  {
    type: 'definition', title: 'Hilbert Space',
    content: 'A **Hilbert space** $\\mathcal{H}$ is an inner product space that is complete with respect to the norm $\\|v\\| = \\sqrt{\\langle v, v \\rangle}$.\n\nKey examples: $L^2(\\Omega)$, $\\ell^2$, $\\mathbb{R}^n$.',
    tags: ['analysis', 'functional-analysis', 'linear-algebra'], refs: [1]
  },
  {
    type: 'theorem', title: 'Riesz Representation Theorem',
    content: 'Let $\\mathcal{H}$ be a Hilbert space. For every bounded linear functional $\\phi : \\mathcal{H} \\to \\mathbb{F}$, there exists unique $y \\in \\mathcal{H}$ such that:\n\n$$\\phi(x) = \\langle x, y \\rangle \\quad \\forall x \\in \\mathcal{H}$$\n\nMoreover $\\|\\phi\\| = \\|y\\|$, establishing $\\mathcal{H} \\cong \\mathcal{H}^*$.',
    tags: ['functional-analysis', 'duality'], refs: [4, 1]
  },
  {
    type: 'example', title: '$L^2$ as Hilbert Space',
    content: 'The space $L^2(\\Omega) = \\{ f : \\int_\\Omega |f|^2\\,d\\mu < \\infty \\}$ with inner product $\\langle f,g \\rangle = \\int_\\Omega f\\bar{g}\\,d\\mu$ is a Hilbert space.\n\nCauchy-Schwarz here gives the Hölder inequality for $p=q=2$.',
    tags: ['functional-analysis', 'measure-theory', 'examples'], refs: [4, 2]
  },
  {
    type: 'lemma', title: 'Parallelogram Law',
    content: 'In any inner product space $V$:\n\n$$\\|u+v\\|^2 + \\|u-v\\|^2 = 2(\\|u\\|^2 + \\|v\\|^2)$$\n\nConversely, any norm satisfying this law arises from an inner product via polarization:\n$$\\langle u,v \\rangle = \\tfrac{1}{4}(\\|u+v\\|^2 - \\|u-v\\|^2)$$',
    tags: ['linear-algebra', 'analysis'], refs: [1]
  },
]

async function main() {
  console.log('Seeding database...')
  await prisma.entry.deleteMany()

  for (const s of SEED) {
    await prisma.entry.create({
      data: {
        type: s.type,
        title: s.title,
        content: s.content,
        tags: JSON.stringify(s.tags),
        refs: JSON.stringify(s.refs),
      }
    })
  }

  console.log(`✓ Seeded ${SEED.length} entries`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

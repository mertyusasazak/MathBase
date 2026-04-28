// app/components/GraphView.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { Entry, Relation } from '@/types'
import { theme } from '@/lib/core/theme'


interface Props {
  entries: Entry[]
  selectedId?: number
  onSelect: (id: number) => void
  relations?: Relation[]
}

const TYPE_COLORS: Record<string, string> = {
  definition: '#6b8fcc',
  theorem: '#c96b6b',
  lemma: '#8fcc8f',
  corollary: '#cc6ba8',
  example: '#cc9f6b',
  remark: '#a06bcc'
}

const RELATION_COLORS: Record<string, string> = {
  uses: '#6b8fcc',
  example_of: '#cc9f6b',
  generalizes: '#8fcc8f',
  proof_depends_on: '#c96b6b',
  related_to: '#7a7870',
  contrasts_with: '#cc6ba8',
}

const savedPositions: Record<number, { x: number; y: number }> = {}
let savedTransform: { k: number; x: number; y: number } | null = null

export default function GraphView({ entries, selectedId, onSelect, relations = [] }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [resetKey, setResetKey] = useState(0)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [hiddenRelations, setHiddenRelations] = useState<Set<string>>(new Set())
  const [hoveredNode, setHoveredNode] = useState<any>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleReset = useCallback(() => {
    Object.keys(savedPositions).forEach(k => delete savedPositions[parseInt(k)])
    savedTransform = null
    setHiddenTypes(new Set())
    setHiddenRelations(new Set())
    setResetKey(k => k + 1)
  }, [])

  const toggleType = (type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const toggleRelation = (rel: string) => {
    setHiddenRelations(prev => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }

  useEffect(() => {
    if (!svgRef.current || entries.length === 0) return

    const filteredEntries = entries.filter(e => !hiddenTypes.has(e.type))
    const filteredRelations = relations.filter(r =>
      !hiddenRelations.has(r.relationType) &&
      !hiddenTypes.has(entries.find(x => x.id === r.fromEntryId)?.type || '') &&
      !hiddenTypes.has(entries.find(x => x.id === r.toEntryId)?.type || '')
    )

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const refCount: Record<number, number> = {}
    filteredEntries.forEach(e => {
      e.refs.forEach(r => { if (filteredEntries.find(x => x.id === r)) refCount[r] = (refCount[r] || 0) + 1 })
    })

    const nodes = filteredEntries.map(e => ({
      id: e.id,
      title: e.title.replace(/\$([^$]+)\$/g, (_: string, m: string) =>
        m.replace(/\^(\d)/g, (_: string, n: string) => ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'][parseInt(n)] || n)
          .replace(/\^{(\d+)}/g, (_: string, n: string) => n.split('').map((d: string) => ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'][parseInt(d)] || d).join(''))
          .replace(/[{}\\\\/]/g, '')
      ),
      type: e.type,
      refs: e.refs,
      refCount: refCount[e.id] || 0,
      x: savedPositions[e.id]?.x ?? width / 2 + (Math.random() - 0.5) * 200,
      y: savedPositions[e.id]?.y ?? height / 2 + (Math.random() - 0.5) * 200,
    }))

    // Build links exclusively from the relations table
    const links = filteredRelations
      .filter(r => nodes.find(x => x.id === r.fromEntryId) && nodes.find(x => x.id === r.toEntryId))
      .map(r => ({
        source: r.fromEntryId,
        target: r.toEntryId,
        relationType: r.relationType
      }))

    // Arrow markers per relation type
    const defs = svg.append('defs')
    Object.entries(RELATION_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color + '99')
    })

    // Default arrow
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', theme.colors.textMuted)

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        savedTransform = { k: event.transform.k, x: event.transform.x, y: event.transform.y }
      })

    svg.call(zoom)

    if (savedTransform) {
      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(savedTransform.x, savedTransform.y).scale(savedTransform.k)
      )
    }

    const hasPositions = entries.some(e => savedPositions[e.id])

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))
      .alpha(hasPositions ? 0.05 : 1)
      .alphaDecay(hasPositions ? 0.1 : 0.028)

    // Group links by source-target pair to calculate curvature
    const linkGroups: Record<string, any[]> = {}
    links.forEach((l: any) => {
      const ids = [l.source, l.target].sort()
      const key = `${ids[0]}-${ids[1]}`
      if (!linkGroups[key]) linkGroups[key] = []
      linkGroups[key].push(l)
    })

    links.forEach((l: any) => {
      const ids = [l.source, l.target].sort()
      const key = `${ids[0]}-${ids[1]}`
      const group = linkGroups[key]
      const index = group.indexOf(l)
      l.curvature = (index - (group.length - 1) / 2) * 0.12
    })

    // Visible link paths (for lines and arrows)
    const link = g.append('g')
      .selectAll('path').data(links).join('path')
      .attr('stroke', (d: any) => RELATION_COLORS[d.relationType] || theme.colors.border)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5)
      .attr('fill', 'none')
      .attr('marker-end', (d: any) => `url(#arrow-${d.relationType})`)

    // Invisible helper paths for text orientation
    const textPath = g.append('g')
      .selectAll('path').data(links).join('path')
      .attr('id', (d: any, i: number) => `textpath-${i}`)
      .attr('fill', 'none')
      .attr('stroke', 'none')
      .style('pointer-events', 'none')

    // Edge labels using textPath
    const edgeLabels = g.append('g')
      .selectAll('text').data(links).join('text')
      .attr('font-size', '8px')
      .attr('font-family', 'Instrument Sans, sans-serif')
      .attr('font-weight', '600')
      .style('letter-spacing', '0.03em')
      .style('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', theme.colors.background)
      .style('stroke-width', '3px')
      .style('stroke-linecap', 'round')
      .style('stroke-linejoin', 'round')
      .append('textPath')
      .attr('xlink:href', (d: any, i: number) => `#textpath-${i}`)
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d: any) => RELATION_COLORS[d.relationType] || theme.colors.textMuted)
      .text((d: any) => d.relationType.replace(/_/g, ' '))

    const node = g.append('g')
      .selectAll('g').data(nodes).join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d: any) => onSelect(d.id))
      .on('mouseover', (event, d: any) => {
        setHoveredNode(d)
        setMousePos({ x: event.clientX, y: event.clientY })
      })
      .on('mousemove', (event) => {
        setMousePos({ x: event.clientX, y: event.clientY })
      })
      .on('mouseout', () => {
        setHoveredNode(null)
      })
      .call(
        d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x; d.fy = event.y
            savedPositions[d.id] = { x: event.x, y: event.y }
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
            savedPositions[d.id] = { x: d.x, y: d.y }
          })
      )

    node.append('circle')
      .attr('r', (d: any) => 10 + d.refCount * 4)
      .attr('fill', (d: any) => TYPE_COLORS[d.type] + (d.id === selectedId ? 'ff' : '88'))
      .attr('stroke', (d: any) => d.id === selectedId ? TYPE_COLORS[d.type] : 'transparent')
      .attr('stroke-width', 3)

    node.append('text')
      .text((d: any) => d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => 10 + d.refCount * 4 + 14)
      .attr('fill', theme.colors.textDim).attr('font-size', '10px')
      .attr('font-family', 'Instrument Sans, sans-serif')
      .style('pointer-events', 'none')

    node.append('text')
      .text((d: any) => d.type.slice(0, 3).toUpperCase())
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', '#000').attr('font-size', '7px').attr('font-weight', 'bold')
      .attr('font-family', 'Instrument Sans, sans-serif')
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x
        const dy = d.target.y - d.source.y
        const dr = Math.sqrt(dx * dx + dy * dy)
        const radius = d.curvature === 0 ? 0 : dr / (d.curvature * 2)
        
        if (radius === 0) {
          return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
        } else {
          const sweep = d.curvature > 0 ? 1 : 0
          return `M${d.source.x},${d.source.y}A${Math.abs(radius)},${Math.abs(radius)} 0 0,${sweep} ${d.target.x},${d.target.y}`
        }
      })

      // Update helper paths for text (always left-to-right)
      textPath.attr('d', (d: any) => {
        const isLeftToRight = d.source.x <= d.target.x
        const start = isLeftToRight ? d.source : d.target
        const end = isLeftToRight ? d.target : d.source
        
        const dx = end.x - start.x
        const dy = end.y - start.y
        const dr = Math.sqrt(dx * dx + dy * dy)
        const radius = d.curvature === 0 ? 0 : dr / (d.curvature * 2)
        
        if (radius === 0) {
          return `M${start.x},${start.y}L${end.x},${end.y}`
        } else {
          // If we reversed the direction, we must also flip the sweep to keep the curve shape same
          const baseSweep = d.curvature > 0 ? 1 : 0
          const sweep = isLeftToRight ? baseSweep : (1 - baseSweep)
          return `M${start.x},${start.y}A${Math.abs(radius)},${Math.abs(radius)} 0 0,${sweep} ${end.x},${end.y}`
        }
      })

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      nodes.forEach(n => {
        savedPositions[n.id] = { x: (n as any).x, y: (n as any).y }
      })
    })

    return () => { simulation.stop() }
  }, [entries, resetKey, relations, hiddenTypes, hiddenRelations])

  // Update selected node colors
  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .selectAll('circle')
      .attr('fill', function (d: any) {
        return TYPE_COLORS[d.type] + (d.id === selectedId ? 'ff' : '88')
      })
      .attr('stroke', function (d: any) {
        return d.id === selectedId ? TYPE_COLORS[d.type] : 'transparent'
      })
  }, [selectedId])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        display: 'flex', flexWrap: 'wrap', gap: 5
      }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span
            key={type}
            onClick={() => toggleType(type)}
            style={{
              fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.62rem',
              padding: '2px 8px', borderRadius: 20,
              background: hiddenTypes.has(type) ? theme.colors.surface : color + '22',
              color: hiddenTypes.has(type) ? theme.colors.textMuted : color,
              border: `1px solid ${hiddenTypes.has(type) ? theme.colors.border : color + '44'}`,
              cursor: 'pointer',
              opacity: hiddenTypes.has(type) ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {type}
          </span>
        ))}
      </div>

      {/* Relation type legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
        background: theme.colors.background + '99',
        padding: '8px', borderRadius: 8, backdropFilter: 'blur(4px)',
        border: `1px solid ${theme.colors.border}`
      }}>
        <div style={{ fontSize: '0.6rem', color: theme.colors.textMuted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Relationships</div>
        {Object.entries(RELATION_COLORS).map(([type, color]) => (
          <span
            key={type}
            onClick={() => toggleRelation(type)}
            style={{
              fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.58rem',
              padding: '2px 6px', color: hiddenRelations.has(type) ? theme.colors.textMuted : color + 'cc',
              display: 'flex', alignItems: 'center', gap: 4,
              cursor: 'pointer',
              opacity: hiddenRelations.has(type) ? 0.4 : 1,
              transition: 'all 0.2s'
            }}
          >
            <span style={{ display: 'inline-block', width: 12, height: 2, background: hiddenRelations.has(type) ? theme.colors.border : color + '88' }} />
            {type.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div style={{
          position: 'fixed',
          top: mousePos.y + 15,
          left: mousePos.x + 15,
          zIndex: 2000,
          background: theme.colors.surface,
          border: `1px solid ${TYPE_COLORS[hoveredNode.type]}`,
          padding: '8px 12px',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{ fontSize: '0.65rem', color: TYPE_COLORS[hoveredNode.type], fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
            {hoveredNode.type}
          </div>
          <div style={{ fontFamily: theme.typography.serif, fontSize: '1.1rem', color: theme.colors.text }}>
            {hoveredNode.title}
          </div>
        </div>
      )}

      <button
        onClick={handleReset}
        style={{
          position: 'absolute', bottom: 10, right: 10, zIndex: 10,
          fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.68rem',
          padding: '4px 10px', borderRadius: 5,
          border: `1px solid ${theme.colors.border}`, background: theme.colors.surface,
          color: theme.colors.textMuted, cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = theme.colors.accent)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = theme.colors.border)}
      >
        ↺ Reset View
      </button>

      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 10,
        fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', color: theme.colors.textMuted
      }}>
        Scroll to zoom · Drag to move · Click legends to filter
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: '100%', background: theme.colors.background }} />
    </div>
  )
}
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

  const handleReset = useCallback(() => {
    Object.keys(savedPositions).forEach(k => delete savedPositions[parseInt(k)])
    savedTransform = null
    setResetKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (!svgRef.current || entries.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const refCount: Record<number, number> = {}
    entries.forEach(e => {
      e.refs.forEach(r => { refCount[r] = (refCount[r] || 0) + 1 })
    })

    const nodes = entries.map(e => ({
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

    // Build links from relations if available, fallback to refs
    const relationMap = new Map<string, string>()
    relations.forEach(r => {
      relationMap.set(`${r.fromEntryId}-${r.toEntryId}`, r.relationType)
    })

    const links = entries.flatMap(e =>
      e.refs
        .filter(r => entries.find(x => x.id === r))
        .map(r => ({
          source: e.id,
          target: r,
          relationType: relationMap.get(`${e.id}-${r}`) || 'related_to'
        }))
    )

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

    // Links with relation-type coloring
    const link = g.append('g')
      .selectAll('line').data(links).join('line')
      .attr('stroke', (d: any) => RELATION_COLORS[d.relationType] || theme.colors.border)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5)
      .attr('marker-end', (d: any) => `url(#arrow-${d.relationType})`)

    // Edge labels
    const edgeLabels = g.append('g')
      .selectAll('text').data(links).join('text')
      .text((d: any) => d.relationType.replace(/_/g, ' '))
      .attr('text-anchor', 'middle')
      .attr('fill', (d: any) => RELATION_COLORS[d.relationType] || theme.colors.textMuted)
      .attr('fill-opacity', 0.8)
      .attr('font-size', '8px')
      .attr('font-family', 'Instrument Sans, sans-serif')
      .style('pointer-events', 'none')

    const node = g.append('g')
      .selectAll('g').data(nodes).join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d: any) => onSelect(d.id))
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
      link
        .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)

      edgeLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 5)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      nodes.forEach(n => {
        savedPositions[n.id] = { x: (n as any).x, y: (n as any).y }
      })
    })

    return () => { simulation.stop() }
  }, [entries, resetKey, relations])

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
          <span key={type} style={{
            fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.62rem',
            padding: '2px 6px', borderRadius: 20,
            background: color + '22', color, border: `1px solid ${color}44`
          }}>
            {type}
          </span>
        ))}
      </div>

      {/* Relation type legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 3
      }}>
        {Object.entries(RELATION_COLORS).map(([type, color]) => (
          <span key={type} style={{
            fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.58rem',
            padding: '2px 6px', color: color + 'cc',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ display: 'inline-block', width: 12, height: 2, background: color + '88' }} />
            {type.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

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
        ↺ Reset
      </button>

      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 10,
        fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.65rem', color: theme.colors.textMuted
      }}>
        Scroll to zoom · Drag to move
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: '100%', background: theme.colors.background }} />
    </div>
  )
}
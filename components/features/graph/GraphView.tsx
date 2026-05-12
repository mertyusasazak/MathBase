// app/components/GraphView.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { Entry, Relation } from '@/types'
import { theme } from '@/lib/core/theme'
import { RELATION_LABELS, INVERSE_RELATION_LABELS, TYPE_COLORS, ENTRY_TYPES } from '@/lib/core/constants'
import { useAppContext } from '@/lib/context/AppContext'


interface Props {
  entries: Entry[]
  selectedId?: number
  onSelect: (id: number) => void
  relations?: Relation[]
}

// Type shape families for graph nodes
const TYPE_SHAPE: Record<string, 'circle' | 'diamond' | 'square' | 'triangle'> = {
  definition: 'circle',
  theorem:    'circle',
  lemma:      'circle',
  corollary:  'circle',
  example:    'triangle',
  remark:     'triangle',
  algorithm:  'square',
  proof:      'square',
  axiom:      'diamond',
  assumption: 'diamond',
}

const RELATION_COLORS: Record<string, string> = {
  uses: '#6b8fcc',
  example_of: '#cc9f6b',
  generalizes: '#8fcc8f',
  proof_depends_on: '#c96b6b',
  related_to: '#7a7870',
  contrasts_with: '#cc6ba8',
}

const ALL_RELATION_TYPES = Object.keys(RELATION_COLORS)

export default function GraphView({ entries, selectedId, onSelect, relations = [] }: Props) {
  const { state: appState, actions: appActions } = useAppContext()
  const { 
    graphHiddenTypes: hiddenTypes, 
    graphActiveIncoming: activeIncoming, 
    graphActiveOutgoing: activeOutgoing,
    graphPositions: savedPositions,
    graphTransform: savedTransform
  } = appState
  const {
    setGraphHiddenTypes: setHiddenTypes,
    setGraphActiveIncoming: setActiveIncoming,
    setGraphActiveOutgoing: setActiveOutgoing,
    setGraphPositions: setSavedPositions,
    setGraphTransform: setSavedTransform
  } = appActions

  const svgRef = useRef<SVGSVGElement>(null)
  const [resetKey, setResetKey] = useState(0)
  const [hoveredNode, setHoveredNode] = useState<any>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleReset = useCallback(() => {
    setSavedPositions({})
    setSavedTransform(null)
    setHiddenTypes(new Set())
    setActiveIncoming(new Set(Object.keys(RELATION_COLORS)))
    setActiveOutgoing(new Set())
    setResetKey(k => k + 1)
  }, [setSavedPositions, setSavedTransform, setHiddenTypes, setActiveIncoming, setActiveOutgoing])

  const toggleType = (type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const toggleIncoming = (rel: string) => {
    setActiveIncoming(prev => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }

  const toggleOutgoing = (rel: string) => {
    setActiveOutgoing(prev => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }

  useEffect(() => {
    if (!svgRef.current || entries.length === 0) return

    const filteredEntries = entries.filter(e => !hiddenTypes.has(e.type))
    const filteredRelations = relations.filter(r => {
      // Global entry types filter first
      const fromType = entries.find(x => x.id === r.fromEntryId)?.type || ''
      const toType = entries.find(x => x.id === r.toEntryId)?.type || ''
      if (hiddenTypes.has(fromType) || hiddenTypes.has(toType)) return false

      // Directional filters
      if (selectedId) {
        // If node selected, only show edges that are "active" in their respective direction
        if (r.fromEntryId === selectedId) return activeOutgoing.has(r.relationType)
        if (r.toEntryId === selectedId) return activeIncoming.has(r.relationType)

        // Hide relations not connected to the selected node for focus
        return false
      } else {
        // If no node selected, hide only if type is inactive in BOTH columns (since each represents a direction)
        // or effectively, if it's "selected" in either, it shows? 
        // User wants "independent" - so let's say it shows if active in its direction globally.
        // But every edge is both. So it shows if (activeOutgoing HAS type OR activeIncoming HAS type)
        return activeOutgoing.has(r.relationType) || activeIncoming.has(r.relationType)
      }
    })

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

    // 1. Links from explicit Relation table
    const explicitLinks = filteredRelations
      .filter(r => nodes.find(x => x.id === r.fromEntryId) && nodes.find(x => x.id === r.toEntryId))
      .map(r => ({
        source: r.fromEntryId,
        target: r.toEntryId,
        relationType: r.relationType
      }))

    // 2. Fallback links from legacy 'refs' field (shown as 'related_to')
    const legacyLinks: any[] = []
    if (activeOutgoing.has('related_to') || activeIncoming.has('related_to')) {
      filteredEntries.forEach(e => {
        if (e.refs && Array.isArray(e.refs)) {
          e.refs.forEach(refId => {
            // Only add if target node exists and no explicit relation already covers this pair
            if (nodes.find(x => x.id === refId) && 
                !explicitLinks.find(l => (l.source === e.id && l.target === refId) || (l.source === refId && l.target === e.id))) {
              legacyLinks.push({
                source: e.id,
                target: refId,
                relationType: 'related_to'
              })
            }
          })
        }
      })
    }

    const links = [...explicitLinks, ...legacyLinks]

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
        setSavedTransform({ k: event.transform.k, x: event.transform.x, y: event.transform.y })
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
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(300))
      .force('charge', d3.forceManyBody().strength(-1200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(120))
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
      .text((d: any) => {
        const type = d.relationType;
        // If a node is selected, prioritize its perspective
        if (selectedId) {
          if (d.target.id === selectedId) return INVERSE_RELATION_LABELS[type] || type.replace(/_/g, ' ');
          return RELATION_LABELS[type] || type.replace(/_/g, ' ');
        }
        // If no node selected, use label based on which directional filter is active
        // If only Incoming is active for this type, use the inverse label
        if (activeIncoming.has(type) && !activeOutgoing.has(type)) {
          return INVERSE_RELATION_LABELS[type] || type.replace(/_/g, ' ');
        }
        return RELATION_LABELS[type] || type.replace(/_/g, ' ');
      })

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
            setSavedPositions(prev => ({ ...prev, [d.id]: { x: event.x, y: event.y } }))
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
            setSavedPositions(prev => ({ ...prev, [d.id]: { x: d.x, y: d.y } }))
          })
      )

    // ── Node shapes by type family ─────────────────────────────────────────
    node.each(function(d: any) {
      const el = d3.select(this)
      const r = 10 + d.refCount * 4
      const color = TYPE_COLORS[d.type] || theme.colors.accent
      const isSelected = d.id === selectedId
      const fillOpacity = isSelected ? 'ff' : '88'
      const shape = TYPE_SHAPE[d.type] || 'circle'

      if (shape === 'circle') {
        el.append('circle')
          .attr('r', r)
          .attr('fill', color + fillOpacity)
          .attr('stroke', isSelected ? color : 'transparent')
          .attr('stroke-width', 3)
      } else if (shape === 'square') {
        const s = r * 1.5
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 4).attr('ry', 4)
          .attr('fill', color + fillOpacity)
          .attr('stroke', isSelected ? color : 'transparent')
          .attr('stroke-width', 3)
      } else if (shape === 'diamond') {
        const s = r * 1.6
        el.append('polygon')
          .attr('points', `0,${-s} ${s},0 0,${s} ${-s},0`)
          .attr('fill', color + fillOpacity)
          .attr('stroke', isSelected ? color : 'transparent')
          .attr('stroke-width', 3)
      } else if (shape === 'triangle') {
        const s = r * 1.5
        el.append('polygon')
          .attr('points', `0,${-s} ${s * 0.87},${s * 0.5} ${-s * 0.87},${s * 0.5}`)
          .attr('fill', color + fillOpacity)
          .attr('stroke', isSelected ? color : 'transparent')
          .attr('stroke-width', 3)
      }
    })

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
        const type = d.relationType;
        const isInverse = (selectedId && d.target.id === selectedId) || (!selectedId && activeIncoming.has(type) && !activeOutgoing.has(type));

        const startNode = isInverse ? d.target : d.source;
        const endNode = isInverse ? d.source : d.target;

        const dx = endNode.x - startNode.x
        const dy = endNode.y - startNode.y
        const dr = Math.sqrt(dx * dx + dy * dy)
        const radius = d.curvature === 0 ? 0 : dr / (d.curvature * 2)

        if (radius === 0) {
          return `M${startNode.x},${startNode.y}L${endNode.x},${endNode.y}`
        } else {
          const sweep = d.curvature > 0 ? 1 : 0
          return `M${startNode.x},${startNode.y}A${Math.abs(radius)},${Math.abs(radius)} 0 0,${sweep} ${endNode.x},${endNode.y}`
        }
      })

      // Update helper paths for text (always left-to-right for readability)
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
          // To keep the same arc as the visible link, we must account for:
          // 1. The original curvature direction
          // 2. Whether the visible link itself is currently inverted
          // 3. Whether we have swapped source/target for left-to-right readability

          const type = d.relationType;
          const isLinkInverse = (selectedId && d.target.id === selectedId) || (!selectedId && activeIncoming.has(type) && !activeOutgoing.has(type));

          // The visible link sweep logic: sweep = (d.curvature > 0 ? 1 : 0)
          // If we are left-to-right and NOT inverse, we match d.source -> d.target.
          // If we swapped for readability OR the link is inverse, we might need to flip the sweep.

          let sweep = d.curvature > 0 ? 1 : 0;

          // If the readable path direction (start->end) is OPPOSITE to the link path direction, flip sweep.
          const linkStart = isLinkInverse ? d.target : d.source;
          if (start.id !== linkStart.id) {
            sweep = 1 - sweep;
          }

          return `M${start.x},${start.y}A${Math.abs(radius)},${Math.abs(radius)} 0 0,${sweep} ${end.x},${end.y}`
        }
      })

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      // Batch position updates only on end of drag to avoid state storm if possible, 
      // but tick-based update is harder to throttle without losing sync.
      // We'll rely on the drag handler for manual moves.
    })

    return () => { simulation.stop() }
  }, [entries, resetKey, relations, hiddenTypes, activeIncoming, activeOutgoing, selectedId])

  // Update selected node highlight
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    // Circles
    svg.selectAll('circle').attr('fill', function(d: any) {
      return (TYPE_COLORS[d.type] || theme.colors.accent) + (d.id === selectedId ? 'ff' : '88')
    }).attr('stroke', function(d: any) {
      return d.id === selectedId ? (TYPE_COLORS[d.type] || theme.colors.accent) : 'transparent'
    })
    // Rects (squares)
    svg.selectAll('rect').attr('fill', function(d: any) {
      return (TYPE_COLORS[d.type] || theme.colors.accent) + (d.id === selectedId ? 'ff' : '88')
    }).attr('stroke', function(d: any) {
      return d.id === selectedId ? (TYPE_COLORS[d.type] || theme.colors.accent) : 'transparent'
    })
    // Polygons (diamonds + triangles)
    svg.selectAll('polygon').attr('fill', function(d: any) {
      return (TYPE_COLORS[d.type] || theme.colors.accent) + (d.id === selectedId ? 'ff' : '88')
    }).attr('stroke', function(d: any) {
      return d.id === selectedId ? (TYPE_COLORS[d.type] || theme.colors.accent) : 'transparent'
    })
  }, [selectedId])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        display: 'flex', flexWrap: 'wrap', gap: 5
      }}>
        {ENTRY_TYPES.map((type) => {
          const color = TYPE_COLORS[type] || theme.colors.accent
          const shape = TYPE_SHAPE[type] || 'circle'
          const shapeIcon = shape === 'circle' ? '●' : shape === 'square' ? '■' : shape === 'diamond' ? '◆' : '▲'
          return (
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
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <span style={{ fontSize: '0.55rem' }}>{shapeIcon}</span>
              {type}
            </span>
          )
        })}
      </div>

      {/* Relation type legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 12,
        background: theme.colors.background + '99',
        padding: '12px', borderRadius: 12, backdropFilter: 'blur(8px)',
        border: `1px solid ${theme.colors.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        minWidth: 240
      }}>
        <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: 6, marginBottom: 4 }}>
          Relationships
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          {/* Outgoing Section */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.55rem', color: theme.colors.accent, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', opacity: 0.8 }}>Outgoing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(RELATION_COLORS).map(([type, color]) => (
                <span
                  key={type}
                  onClick={() => toggleOutgoing(type)}
                  style={{
                    fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.58rem',
                    padding: '3px 6px', color: !activeOutgoing.has(type) ? theme.colors.textMuted : color + 'cc',
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer',
                    background: !activeOutgoing.has(type) ? 'transparent' : color + '11',
                    borderRadius: 4,
                    opacity: !activeOutgoing.has(type) ? 0.4 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ display: 'inline-block', width: 8, height: 2, background: !activeOutgoing.has(type) ? theme.colors.border : color + '88' }} />
                  {RELATION_LABELS[type] || type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Incoming Section */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.55rem', color: theme.colors.accent, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', opacity: 0.8 }}>Incoming</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(RELATION_COLORS).map(([type, color]) => (
                <span
                  key={type}
                  onClick={() => toggleIncoming(type)}
                  style={{
                    fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.58rem',
                    padding: '3px 6px', color: !activeIncoming.has(type) ? theme.colors.textMuted : color + 'cc',
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer',
                    background: !activeIncoming.has(type) ? 'transparent' : color + '11',
                    borderRadius: 4,
                    opacity: !activeIncoming.has(type) ? 0.4 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ display: 'inline-block', width: 8, height: 2, background: !activeIncoming.has(type) ? theme.colors.border : color + '88' }} />
                  {INVERSE_RELATION_LABELS[type] || type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
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
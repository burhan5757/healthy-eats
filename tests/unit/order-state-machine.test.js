import { describe, expect, it } from 'vitest'
import {
  ALLOWED_TRANSITIONS,
  ORDER_PROGRESS,
  ORDER_STATUSES,
  TRANSITION_ROLE,
  canTransition,
                   
} from '../../shared/index'

/**
 * The state machine is the safety-critical part of the product: it is what stops
 * the kitchen cooking an order admin is about to cancel, and what stops a
 * cancelled order silently counting as revenue.
 */
describe('order state machine', () => {
  it('moves an order through the happy path', () => {
    expect(canTransition('placed', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'ready')).toBe(true)
    expect(canTransition('ready', 'delivered')).toBe(true)
  })

  it('allows cancelling before the food is cooked', () => {
    expect(canTransition('placed', 'cancelled')).toBe(true)
    expect(canTransition('preparing', 'cancelled')).toBe(true)
  })

  it('REFUSES to cancel an order that is already ready', () => {
    // The food exists by then — cancelling would mean throwing it away and
    // telling the customer nothing was made.
    expect(canTransition('ready', 'cancelled')).toBe(false)
  })

  it('refuses to cancel or reopen a finished order', () => {
    expect(canTransition('delivered', 'cancelled')).toBe(false)
    expect(canTransition('delivered', 'preparing')).toBe(false)
    expect(canTransition('cancelled', 'preparing')).toBe(false)
    expect(canTransition('cancelled', 'delivered')).toBe(false)
  })

  it('refuses to skip the kitchen', () => {
    expect(canTransition('placed', 'ready')).toBe(false)
    expect(canTransition('placed', 'delivered')).toBe(false)
    expect(canTransition('preparing', 'delivered')).toBe(false)
  })

  it('never transitions to itself', () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false)
    }
  })

  it('treats delivered and cancelled as terminal', () => {
    expect(ALLOWED_TRANSITIONS.delivered).toHaveLength(0)
    expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0)
  })

  it('gives every status a transition entry', () => {
    for (const status of ORDER_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('assigns the ready transition to the chef and the rest to admin', () => {
    expect(TRANSITION_ROLE.ready).toBe('chef')
    expect(TRANSITION_ROLE.preparing).toBe('admin')
    expect(TRANSITION_ROLE.delivered).toBe('admin')
    expect(TRANSITION_ROLE.cancelled).toBe('admin')
  })

  it('keeps cancelled off the customer-facing progress track', () => {
    expect(ORDER_PROGRESS).not.toContain('cancelled'               )
    expect([...ORDER_PROGRESS]).toEqual(['placed', 'preparing', 'ready', 'delivered'])
  })

  it('can reach every non-initial status from placed', () => {
    // Guards against a status being added to the enum but orphaned from the graph.
    const seen = new Set             (['placed'])
    const queue                = ['placed']
    while (queue.length) {
      for (const next of ALLOWED_TRANSITIONS[queue.shift() ]) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    expect(seen.size).toBe(ORDER_STATUSES.length)
  })
})

import { describe, expect, it } from 'vitest'
import { buildDishImageQuery } from '../../backend/scripts/lib/dish-image-query.js'

/**
 * The seeded menu has empty `description`/`ingredients` for every dish
 * (CLAUDE.md §8b), so the stock-photo search query is built from the dish's
 * own name — filler words stripped, Indian terms translated to what a
 * Western-leaning stock library actually indexes. The one thing that must
 * never go wrong: a veg dish must never search for a meat, fish or egg word.
 */
describe('dish image query', () => {
  it('keeps the real protein and drops marketing words for a non-veg dish', () => {
    const query = buildDishImageQuery({
      name: 'Lean Chicken Thali',
      category: 'Lunch & Dinner',
      diet: ['non-veg'],
    })
    expect(query).toContain('chicken')
    expect(query).not.toContain('lean')
    expect(query).not.toContain('vegetarian')
  })

  it('extracts the literal food noun for a veg dish, not just the category', () => {
    const query = buildDishImageQuery({
      name: 'Sweet Potato Bowl',
      category: 'Pre-Workout',
      diet: ['veg'],
    })
    expect(query).toContain('vegetarian')
    expect(query).toContain('sweet potato')
  })

  it('never searches a meat/fish/egg word for a veg dish with a meat-sounding name', () => {
    const query = buildDishImageQuery({
      name: 'Soy Keema Bowl',
      category: 'Basic Fitness',
      diet: ['veg'],
    })
    expect(query).toContain('vegetarian')
    expect(query).toContain('soy')
    for (const meat of ['chicken', 'fish', 'mutton', 'egg', 'keema']) {
      expect(query).not.toContain(meat)
    }
  })

  it('translates an Indian term into words a Western stock library indexes', () => {
    const query = buildDishImageQuery({
      name: 'Soy Keema & Bhakri',
      category: 'Lunch & Dinner',
      diet: ['veg'],
    })
    expect(query).toContain('indian flatbread')
    expect(query).not.toContain('keema')
  })

  it('falls back to the category hint when no food word survives filtering', () => {
    const query = buildDishImageQuery({
      name: 'Diet Special Combo',
      category: 'Salads & Steam',
      diet: ['veg'],
    })
    expect(query).toContain('salad bowl')
  })
})

import { describe, expect, it } from 'vitest'
import { isWithinSectionWindow } from '../app/scene/core/timeline'

describe('scene label section timing', () => {
  it('shows the station label only during its section window', () => {
    const metric = { t0: 200, t1: 400 }
    expect(isWithinSectionWindow(199, metric)).toBe(false)
    expect(isWithinSectionWindow(200, metric)).toBe(true)
    expect(isWithinSectionWindow(399, metric)).toBe(true)
    expect(isWithinSectionWindow(400, metric)).toBe(false)
    expect(isWithinSectionWindow(200, undefined)).toBe(false)
  })
})

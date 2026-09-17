import { Component } from 'react'
import { BRAND } from '@shared/index'

/**
 * Last line of defence: a render error anywhere below shows this instead of a
 * blank page. The cart lives in local storage, so a reload loses nothing.
 */
export class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('[ui] render failed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="eyebrow text-muted-foreground">Something went wrong</p>
          <h1 className="mt-4 text-4xl">This page hit a problem</h1>
          <p className="mx-auto mt-5 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
            Your cart is safe. Reload to try again, or call the kitchen on{' '}
            {BRAND.phone}.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-9 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark"
          >
            Reload
          </button>
        </div>
      </main>
    )
  }
}

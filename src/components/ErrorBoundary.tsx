import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
  copyStatus: 'idle' | 'success' | 'error'
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copyStatus: 'idle'
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      errorInfo: errorInfo.componentStack
    })
  }

  handleCopyError = () => {
    const { error, errorInfo } = this.state
    const errorText = `Error: ${error?.message || 'Unknown error'}\n\nStack Trace:\n${error?.stack || 'No stack trace'}\n\nComponent Stack:${errorInfo || 'No component stack'}`

    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copyStatus: 'success' })
      setTimeout(() => this.setState({ copyStatus: 'idle' }), 3000)
    }).catch(() => {
      this.setState({ copyStatus: 'error' })
      setTimeout(() => this.setState({ copyStatus: 'idle' }), 3000)
    })
  }

  handleReload = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
          {/* Top bar */}
          <nav className="relative z-10 border-b border-amber-200/50 bg-white/40 backdrop-blur-xl">
            <div className="mx-auto max-w-[1200px] px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold tracking-tight text-amber-900">Cottage Trip</h1>
              </div>
            </div>
          </nav>

          {/* Error Content */}
          <main className="relative z-10 mx-auto max-w-[1200px] px-6">
            <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
              <div className="mx-auto max-w-2xl">
                {/* Error Card */}
                <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
                  {/* Error Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                      <svg
                        className="h-8 w-8 text-red-600"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>

                  {/* Error Title */}
                  <h2 className="mb-4 text-center text-3xl font-bold text-amber-900">
                    Something went wrong
                  </h2>

                  {/* Error Message */}
                  <p className="mb-6 text-center text-lg text-amber-800">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </p>

                  {/* Error Details */}
                  {this.state.error && (
                    <div className="mb-6 max-h-48 overflow-auto rounded-lg bg-amber-50/50 p-4">
                      <p className="font-mono text-xs text-amber-900 break-all">
                        {this.state.error.stack}
                      </p>
                    </div>
                  )}

                  {/* Copy Status Message */}
                  {this.state.copyStatus === 'success' && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="ml-3 text-sm font-semibold text-green-800">
                          Error details copied to clipboard
                        </p>
                      </div>
                    </div>
                  )}

                  {this.state.copyStatus === 'error' && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 text-red-600"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="ml-3 text-sm font-semibold text-red-800">
                          Failed to copy error details
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      onClick={this.handleCopyError}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-amber-600 bg-white/50 px-6 py-3 text-base font-semibold text-amber-900 backdrop-blur-sm transition hover:border-amber-700 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Error
                    </button>
                    <button
                      onClick={this.handleReload}
                      className="rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                    >
                      Go to Home
                    </button>
                  </div>

                  {/* Help Text */}
                  <p className="mt-6 text-center text-sm text-amber-700">
                    If this problem persists, please contact support with the error details.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      )
    }

    return this.props.children
  }
}

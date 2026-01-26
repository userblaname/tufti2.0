import { Component, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: string | null
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error)
        console.error('[ErrorBoundary] Error info:', errorInfo)
        this.setState({ errorInfo: errorInfo.componentStack || null })
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-8">
                    <div className="max-w-md text-center space-y-4">
                        <h1 className="text-2xl font-bold text-red-400">Something went wrong 😔</h1>
                        <p className="text-zinc-400">
                            The app encountered an error. This might be a temporary issue.
                        </p>

                        {this.state.error && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
                                <p className="text-sm text-red-300 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center mt-6">
                            <button
                                onClick={this.handleRetry}
                                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-black font-medium rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mt-6 text-left">
                                <summary className="text-zinc-400 cursor-pointer hover:text-zinc-300">
                                    Error Details (dev only)
                                </summary>
                                <pre className="mt-2 p-4 bg-zinc-800 rounded-lg text-xs text-zinc-400 overflow-auto max-h-48">
                                    {this.state.errorInfo}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary

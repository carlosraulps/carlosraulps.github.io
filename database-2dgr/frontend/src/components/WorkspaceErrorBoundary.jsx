import React from 'react'
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react'

export class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('WorkspaceErrorBoundary caught an error in workspace:', this.props.activeWorkspace, error, errorInfo)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.activeWorkspace !== this.props.activeWorkspace && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="workspace-error-fallback" role="alert">
          <div className="workspace-error-card">
            <div className="workspace-error-icon">
              <ShieldAlert size={36} />
            </div>
            <div className="workspace-error-eyebrow">
              DIAGNOSTIC EXCEPTION · {String(this.props.activeWorkspace || 'WORKSPACE').toUpperCase()}
            </div>
            <h2 className="workspace-error-title">Workspace Render Safeguard Active</h2>
            <p className="workspace-error-desc">
              The requested calculation module encountered an unexpected runtime state. Your session and database cache remain preserved.
            </p>
            {this.state.error && (
              <div className="workspace-error-details mono">
                <code>{this.state.error.message || String(this.state.error)}</code>
              </div>
            )}
            <div className="workspace-error-actions">
              <button
                type="button"
                className="button-primary workspace-error-btn"
                onClick={this.handleReset}
              >
                <Home size={16} />
                <span>Return to Catalog Index</span>
              </button>
              <button
                type="button"
                className="button-secondary workspace-error-btn"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                <RefreshCw size={15} />
                <span>Retry Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

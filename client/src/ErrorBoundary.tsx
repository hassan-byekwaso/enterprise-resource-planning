import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected application rendering error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <section className="app-error__card">
            <span className="app-error__mark" aria-hidden="true">!</span>
            <p className="eyebrow">ERP WORKSPACE</p>
            <h1>Something went wrong</h1>
            <p className="app-error__message">
              The workspace hit an unexpected error. You can try rendering it again or reload the application.
            </p>
            <div className="app-error__actions">
              <button className="secondary-button" onClick={() => this.setState({ hasError: false })}>
                Try again
              </button>
              <button className="primary-button" onClick={() => window.location.reload()}>
                Reload application
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

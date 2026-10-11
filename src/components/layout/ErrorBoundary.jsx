import React from 'react';
import { RefreshCcw } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Catches render/lifecycle errors in its subtree so one broken page can't
 * take down the whole app shell (Navbar/Footer stay interactive). Must be a
 * class component — React only supports error boundaries via
 * `componentDidCatch`/`getDerivedStateFromError`, there's no hook
 * equivalent.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center text-center gap-4 max-w-sm">
            <h2 className="font-heading text-brand-white text-xl font-bold">Something went wrong</h2>
            <p className="text-brand-grey text-sm">
              This page hit an unexpected error. You can try again, or head back to the homepage.
            </p>
            <Button onClick={this.handleReset}>
              <RefreshCcw size={15} aria-hidden="true" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

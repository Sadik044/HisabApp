import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import i18n from "@/lib/i18n";

interface State { hasError: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // swallow
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const t = i18n.t.bind(i18n);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md">
          <div className="text-6xl">😕</div>
          <p className="mt-4 text-lg font-medium text-foreground">{t("errorBoundary.message")}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            {t("errorBoundary.refresh")}
          </Button>
        </div>
      </div>
    );
  }
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { PricingProvider } from "@/lib/pricing";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center">
        <h1 className="font-display text-7xl text-gradient-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-gold inline-flex rounded-full px-5 py-2.5 text-sm">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center">
        <h1 className="font-display text-xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-gold rounded-full px-4 py-2 text-sm">
            Try again
          </button>
          <a href="/" className="btn-ghost-silver rounded-full px-4 py-2 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0a0a0a" },
      { title: "Pi Global Marketplace | Web3 Luxury Marketplace" },
      { name: "description", content: "Global Web3 marketplace powered by Pi Network. Buy and sell vehicles, real estate, electronics, luxury goods and services with secure Pi transactions." },
      { name: "author", content: "Pi Global Marketplace" },
      { property: "og:site_name", content: "Pi Global Marketplace" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Pi Global Marketplace | Web3 Luxury Marketplace" },
      { name: "twitter:title", content: "Pi Global Marketplace | Web3 Luxury Marketplace" },
      { property: "og:description", content: "Global Web3 marketplace powered by Pi Network. Buy and sell vehicles, real estate, electronics, luxury goods and services with secure Pi transactions." },
      { name: "twitter:description", content: "Global Web3 marketplace powered by Pi Network. Buy and sell vehicles, real estate, electronics, luxury goods and services with secure Pi transactions." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/rj0UhjXvylaySD9jUeYxd5ieDtB3/social-images/social-1784748860875-1000085234.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/rj0UhjXvylaySD9jUeYxd5ieDtB3/social-images/social-1784748860875-1000085234.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <PricingProvider>
          <Outlet />
        </PricingProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

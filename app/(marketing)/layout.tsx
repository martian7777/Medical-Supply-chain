import { MarketingFooter, MarketingNav } from "@/components/marketing";

/**
 * Shell for every public, unauthenticated page except /verify — which deliberately
 * keeps its own stripped layout, because a person standing in a shop holding a box
 * should meet a verdict, not a marketing nav.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <MarketingNav />
      <main className="mkt-main" style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

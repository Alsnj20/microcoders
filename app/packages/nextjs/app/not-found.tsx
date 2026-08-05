import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center h-full flex-1 justify-center bg-muted">
      <div className="text-center">
        <h1 className="text-6xl font-bold m-0 mb-1">404</h1>
        <h2 className="text-2xl font-semibold m-0">Page Not Found</h2>
        <p className="text-foreground/70 m-0 mb-4">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-primary text-primary-foreground px-4 py-2">
          Go Home
        </Link>
      </div>
    </div>
  );
}

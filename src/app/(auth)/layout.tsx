import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 pb-16"
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

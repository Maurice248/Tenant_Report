export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-[calc(100dvh)] min-h-0 flex-1 flex-col">{children}</div>;
}

export default function WorkbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}

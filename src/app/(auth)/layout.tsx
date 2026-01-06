export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-amber-50 to-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 喜庆装饰元素 */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-red-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-100/30 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  );
}


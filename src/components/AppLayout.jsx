import { Outlet, Link, useLocation } from "react-router-dom";
import { Brain, LayoutDashboard, PlusCircle, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "대시보드", to: "/", icon: LayoutDashboard },
  { label: "새 결정", to: "/new", icon: PlusCircle },
  { label: "결정 패턴", to: "/insights", icon: LineChart },
];

export default function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-6 flex items-center gap-2.5 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">결정 메모리</div>
            <div className="text-[11px] text-slate-500">결정 · 예측 · 학습</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-slate-100 text-[11px] text-slate-400">
          당신의 결정 방식을 기록합니다.
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Brain className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">결정 메모리</span>
          <div className="ml-auto flex gap-1">
            {nav.map((item) => {
              const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={cn("flex h-8 w-8 items-center justify-center rounded-lg", active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}>
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </div>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
import {
  Bell,
  CalendarDays,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  Video,
} from "lucide-react";

import Logo from "../components/Logo";

interface CaselyAppProps {
  role?: "client" | "lawyer" | "admin";
}

export default function CaselyApp({
  role = "client",
}: CaselyAppProps) {
  const isLawyer = role === "lawyer";
  const isAdmin = role === "admin";

  const navigation = isAdmin
    ? [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Users",
          icon: Users,
        },
        {
          label: "Cases",
          icon: Gavel,
        },
        {
          label: "Appointments",
          icon: CalendarDays,
        },
        {
          label: "Documents",
          icon: FileText,
        },
        {
          label: "Messages",
          icon: MessageSquare,
        },
        {
          label: "Video Calls",
          icon: Video,
        },
      ]
    : [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "My Cases",
          icon: Gavel,
        },
        ...(isLawyer
          ? [
              {
                label: "Clients",
                icon: Users,
              },
            ]
          : []),
        {
          label: "Appointments",
          icon: CalendarDays,
        },
        {
          label: "Documents",
          icon: FileText,
        },
        {
          label: "Messages",
          icon: MessageSquare,
        },
        {
          label: "Video Calls",
          icon: Video,
        },
      ];

  const roleLabel =
    role === "client"
      ? "Client"
      : role === "lawyer"
        ? "Lawyer"
        : "Administrator";

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-[#D7CFBF] bg-[#FBF9F4] lg:flex">
        <div className="border-b border-[#D7CFBF] px-6 py-5">
          <Logo />
        </div>

        <div className="border-b border-[#D7CFBF] px-6 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            {roleLabel} Portal
          </p>

          <p className="mt-2 font-serif text-xl font-semibold">
            Vakilo
          </p>

          <p className="mt-1 text-sm text-[#77716A]">
            Your legal workspace
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A847B]">
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map((item, index) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition ${
                    index === 0
                      ? "bg-[#171717] font-semibold text-white"
                      : "text-[#55504A] hover:bg-[#F0EBE1]"
                  }`}
                >
                  <Icon size={18} />

                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <p className="px-3 pb-3 pt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A847B]">
            Account
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm text-[#55504A] transition hover:bg-[#F0EBE1]"
          >
            <Settings size={18} />

            <span>Settings</span>
          </button>
        </nav>

        <div className="border-t border-[#D7CFBF] p-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[#55504A] transition hover:bg-[#F0EBE1]"
          >
            <LogOut size={18} />

            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="lg:pl-72">
        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="flex h-20 items-center justify-between px-5 md:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                {roleLabel} Portal
              </p>

              <h1 className="font-serif text-xl font-semibold">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative rounded-full p-2 text-[#55504A] transition hover:bg-[#F0EBE1]"
              >
                <Bell size={19} />

                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#C9A227]" />
              </button>

              <div className="h-9 w-px bg-[#D7CFBF]" />

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] font-serif font-semibold text-[#C9A227]">
                {role === "client"
                  ? "JD"
                  : role === "lawyer"
                    ? "AS"
                    : "AD"}
              </div>
            </div>
          </div>
        </header>

        <section className="px-5 py-10 md:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Vakilo
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">
                Welcome to your legal workspace.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#66615A]">
                Use the navigation to manage your legal
                matters, appointments, documents, messages,
                and other activities.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
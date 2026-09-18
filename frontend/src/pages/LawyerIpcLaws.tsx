import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Home, Search, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import ipcLaws from "../data/ipc_laws_eng.json";

/* ============================================================
   TYPES
============================================================ */

interface IpcSection {
  id: string;
  name: string;
  description: string;
  category: string;
}

const IPC_SECTIONS = ipcLaws as IpcSection[];

/* ============================================================
   COMPONENT
============================================================ */

export default function LawyerIpcLaws() {
  const location = useLocation();
  const isClientPortal = location.pathname.startsWith("/client/");
  const dashboardPath = isClientPortal
    ? "/client/dashboard"
    : "/lawyer/dashboard";

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedSection, setSelectedSection] =
    useState<IpcSection | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(IPC_SECTIONS.map((section) => section.category))
    );

    return unique.sort((a, b) => {
      const numericA = parseInt(a, 10);
      const numericB = parseInt(b, 10);

      if (numericA !== numericB) {
        return numericA - numericB;
      }

      return a.localeCompare(b);
    });
  }, []);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return IPC_SECTIONS.filter((section) => {
      const matchesCategory =
        activeCategory === "all" || section.category === activeCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        section.id.toLowerCase().includes(normalizedQuery) ||
        section.name.toLowerCase().includes(normalizedQuery) ||
        section.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, activeCategory]);

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#77716A] transition hover:text-[#8A6D1D]"
            >
              <Home size={15} />
              Home
            </Link>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
              {isClientPortal ? "Client Portal" : "Lawyer Portal"}
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">
              IPC Sections
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66615A]">
              Search and reference sections of the Indian Penal Code by
              number, keyword, or chapter.
            </p>
          </div>

          <Link
            to={dashboardPath}
            className="ml-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#77716A] transition hover:text-[#8A6D1D]"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
        </div>

        {/* =================================================
            SEARCH + FILTERS
        ================================================= */}

        <div className="mt-8 border border-[#D7CFBF] bg-[#FBF9F4] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A847B]"
              />

              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by section number, title, or keyword..."
                className="w-full border border-[#D7CFBF] bg-white py-3 pl-9 pr-9 text-sm text-[#171717] outline-none transition focus:border-[#C9A227]"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A847B] transition hover:text-[#171717]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              className="border border-[#D7CFBF] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#55504A] outline-none transition focus:border-[#C9A227] md:w-56"
            >
              <option value="all">All Chapters</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  Chapter {category}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#8A847B]">
            {filteredSections.length} section
            {filteredSections.length === 1 ? "" : "s"} found
          </p>
        </div>

        {/* =================================================
            RESULTS + DETAIL
        ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="max-h-[70vh] overflow-y-auto border border-[#D7CFBF] bg-[#FBF9F4]">
            {filteredSections.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <BookOpen size={28} className="text-[#BEB5A5]" />
                <p className="text-sm text-[#77716A]">
                  No sections match your search.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E1DBD0]">
                {filteredSections.map((section) => {
                  const isActive =
                    selectedSection?.id === section.id;

                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSection(section)}
                        className={`flex w-full flex-col gap-1 px-5 py-4 text-left transition ${
                          isActive
                            ? "bg-[#171717] text-white"
                            : "hover:bg-[#F0EBE1]"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            isActive ? "text-[#C9A227]" : "text-[#8A6D1D]"
                          }`}
                        >
                          Section {section.id} &middot; Chapter{" "}
                          {section.category}
                        </span>

                        <span className="font-serif text-base font-semibold">
                          {section.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-6 md:p-8">
            {selectedSection ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                  Section {selectedSection.id} &middot; Chapter{" "}
                  {selectedSection.category}
                </p>

                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {selectedSection.name}
                </h2>

                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#55504A]">
                  {selectedSection.description}
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <BookOpen size={28} className="text-[#BEB5A5]" />
                <p className="text-sm text-[#77716A]">
                  Select a section from the list to view its full text.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

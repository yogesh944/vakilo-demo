import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  FolderKanban,
  MessageSquareLock,
  Mail,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  BriefcaseBusiness,
  Camera,
  Menu,
  X,
} from "lucide-react";
import CNRSearchWidget from "../components/CNRSearchWidget";
import HowItWorks from "../components/HowItWorks";
import Logo from "../components/Logo";
import NewspaperCuttings from "../components/NewspaperCuttings";
import Reveal from "../components/Reveal";
import StatsCounter from "../components/StatsCounter";
import TestimonialsCarousel from "../components/TestimonialsCarousel";
import ClientLogosMarquee from "../components/ClientLogosMarquee";
import HeroSlider from "../components/HeroSlider";

const SERVICE_ICONS = [ShieldCheck, Users, FolderKanban, MessageSquareLock];

export default function Homepage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCNRSearch = (cnrNumber: string) => {
    navigate(`/case-tracker?cnr=${encodeURIComponent(cnrNumber)}`);
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <main id="home" className="min-h-screen bg-[#FBF9F4] text-[#171717]">
      {/* =================================================
          HEADER — sticky, gains blur + shadow on scroll
      ================================================= */}

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          isScrolled
            ? "border-[#DED7CA] bg-[#FBF9F4]/90 shadow-[0_4px_20px_-8px_rgba(23,23,23,0.15)] backdrop-blur-md"
            : "border-transparent bg-[#FBF9F4]"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10 lg:px-16">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            {[
              { href: "#home", label: "Home" },
              { href: "#services", label: "Services" },
              { href: "#how-it-works", label: "How It Works" },
              { href: "#legal-news", label: "Legal News" },
              { href: "/client/ipc-laws", label: "IPC Laws", isRoute: true },
            ].map((item) => (
              item.isRoute ? (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group relative text-sm font-medium text-[#171717] transition hover:text-[#8A6D1D]"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#8A6D1D] transition-all duration-300 group-hover:w-full" />
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="group relative text-sm font-medium text-[#171717] transition hover:text-[#8A6D1D]"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#8A6D1D] transition-all duration-300 group-hover:w-full" />
                </a>
              )
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-[#171717] transition hover:text-[#8A6D1D] lg:block"
            >
              Login
            </Link>

            <Link
              to="/signup"
              className="hidden border border-[#C9A227] bg-[#FBF9F4] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717] transition duration-300 hover:bg-[#D6B43A] hover:shadow-[0_6px_20px_-6px_rgba(201,162,39,0.6)] sm:block"
            >
              Get Started
            </Link>

            <button
              type="button"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center border border-[#D9D2C5] text-[#193B31] transition hover:border-[#C9A227] hover:text-[#8A6D1D] md:hidden"
            >
              {isMobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        <div
          id="mobile-navigation"
          className={`${isMobileMenuOpen ? "block" : "hidden"} border-t border-[#DED7CA] bg-[#FBF9F4] px-6 py-5 md:hidden`}
        >
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {[
              { href: "#home", label: "Home" },
              { href: "#services", label: "Services" },
              { href: "#how-it-works", label: "How It Works" },
              { href: "#legal-news", label: "Legal News" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="border-b border-[#E7E0D4] py-3 text-sm font-medium text-[#193B31]"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/client/ipc-laws"
              onClick={() => setIsMobileMenuOpen(false)}
              className="border-b border-[#E7E0D4] py-3 text-sm font-medium text-[#193B31]"
            >
              IPC Laws
            </Link>
            <div className="flex gap-3 pt-4 sm:hidden">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 border border-[#D9D2C5] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#193B31]"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 border border-[#C9A227] bg-[#FBF9F4] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#171717] transition hover:bg-[#D6B43A]"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* =================================================
          HERO — full-bleed image slider
      ================================================= */}

      <HeroSlider />

        {/* =================================================
          LAWYERS — infinite marquee, trusted expertise
        ================================================= */}

      <ClientLogosMarquee />

      {/* =================================================
          CASE SEARCH
      ================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-10 lg:px-16">
        <Reveal>
          <CNRSearchWidget onSearch={handleCNRSearch} />
        </Reveal>
      </section>

      {/* =================================================
          SERVICES — staggered reveal + hover lift
      ================================================= */}

      <section id="services" className="border-y border-[#DED7CA] bg-[#FBF9F4]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-16">
          <Reveal className="mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
              Our Services
            </p>
            <h2 className="font-serif text-3xl font-semibold md:text-5xl">
              Everything you need for your legal journey.
            </h2>
          </Reveal>

          <div className="grid border-t border-[#D9D2C5] md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "01",
                title: "Legal Guidance",
                text: "Understand your legal situation and your next steps.",
              },
              {
                number: "02",
                title: "Find a Lawyer",
                text: "Connect with lawyers based on your case requirements.",
              },
              {
                number: "03",
                title: "Case Management",
                text: "Keep cases, documents, appointments, and updates organized.",
              },
              {
                number: "04",
                title: "Secure Communication",
                text: "Stay connected with your lawyer through chat and video calls.",
              },
            ].map((service, i) => {
              const Icon = SERVICE_ICONS[i];
              return (
                <Reveal key={service.number} delay={i * 100}>
                  <div className="group relative h-full overflow-hidden border-b border-[#D9D2C5] p-7 transition-all duration-300 hover:bg-[#171717] md:border-r lg:min-h-[250px]">
                    <div className="flex items-start justify-between">
                      <span className="font-serif text-3xl text-[#C9A227] transition-colors duration-300">
                        {service.number}
                      </span>
                      <Icon
                        size={22}
                        className="text-[#BEB5A5] transition-colors duration-300 group-hover:text-[#C9A227]"
                      />
                    </div>

                    <h3 className="mt-8 font-serif text-xl font-semibold transition-colors duration-300 group-hover:text-white">
                      {service.title}
                    </h3>

                    <p className="mt-4 text-sm leading-6 text-[#66615A] transition-colors duration-300 group-hover:text-[#BEB5A5]">
                      {service.text}
                    </p>

                    <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#C9A227] transition-all duration-500 group-hover:w-full" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================================================
          STATS — count-up band
      ================================================= */}

      <StatsCounter />

      {/* =================================================
          HOW IT WORKS
      ================================================= */}

      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* =================================================
          TESTIMONIALS — slide carousel
      ================================================= */}

      <TestimonialsCarousel />

      {/* =================================================
          LEGAL NEWS
      ================================================= */}

      <div id="legal-news">
        <NewspaperCuttings />
      </div>

      {/* =================================================
          CTA — animated gold border glow
      ================================================= */}

      <section className="relative overflow-hidden bg-[#171717] px-6 py-20 text-white md:px-10 lg:px-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(500px circle at 90% 100%, rgba(201,162,39,0.18), transparent 60%)",
          }}
        />
        <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              Start Today
            </p>

            <h2 className="max-w-3xl font-serif text-4xl font-semibold leading-tight md:text-6xl">
              Your legal problem deserves the right guidance.
            </h2>
          </div>

          <Link
            to="/signup"
            className="group flex w-fit items-center gap-2 border border-[#C9A227] px-7 py-4 text-sm font-semibold uppercase tracking-wider text-[#C9A227] transition duration-300 hover:bg-[#C9A227] hover:text-[#171717]"
          >
            Get Started
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="border-t border-[#DED7CA] bg-[#171717] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-16">
          <div className="grid gap-12 border-b border-white/10 pb-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr]">
            {/* Brand + newsletter */}
            <div>
              <Logo />
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#B9B3A8]">
                Vakilo makes legal assistance simpler — understand your case,
                find the right lawyer, manage everything in one place.
              </p>

              <form
                onSubmit={(e) => e.preventDefault()}
                className="mt-6 flex max-w-sm border border-white/15"
              >
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-[#77716A] focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-[#C9A227] px-4 text-[#171717] transition hover:bg-[#D6B43A]"
                  aria-label="Subscribe"
                >
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-6 flex items-center gap-4">
                {[Globe, MessageCircle, BriefcaseBusiness, Camera].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center border border-white/15 text-[#B9B3A8] transition hover:border-[#C9A227] hover:text-[#C9A227]"
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Company links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                Company
              </p>
              <ul className="mt-5 space-y-3 text-sm text-[#B9B3A8]">
                {["About Us", "How It Works", "Careers", "Legal News", "Contact"].map(
                  (item) => (
                    <li key={item}>
                      <a href="#" className="transition hover:text-white">
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Services links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                Services
              </p>
              <ul className="mt-5 space-y-3 text-sm text-[#B9B3A8]">
                {[
                  "Legal Guidance",
                  "Find a Lawyer",
                  "Case Management",
                  "Secure Communication",
                  "CNR Case Search",
                ].map((item) => (
                  <li key={item}>
                    <a href="#" className="transition hover:text-white">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                Get in Touch
              </p>
              <ul className="mt-5 space-y-4 text-sm text-[#B9B3A8]">
                <li className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#C9A227]" />
                  <span>Bandra Kurla Complex, Mumbai, Maharashtra 400051</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={16} className="shrink-0 text-[#C9A227]" />
                  <span>+91 22 4000 1234</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={16} className="shrink-0 text-[#C9A227]" />
                  <span>hello@vakilo.in</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-[#77716A] md:flex-row">
            <p>© {new Date().getFullYear()} Vakilo. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="transition hover:text-[#C9A227]">
                Privacy Policy
              </a>
              <a href="#" className="transition hover:text-[#C9A227]">
                Terms of Service
              </a>
              <a href="#" className="transition hover:text-[#C9A227]">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

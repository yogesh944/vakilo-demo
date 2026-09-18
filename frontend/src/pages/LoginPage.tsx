import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const user = await login(
        email.trim(),
        password
      );

      if (user.role === "client") {
        navigate("/client/dashboard");
      } else if (user.role === "lawyer") {
        navigate("/lawyer/dashboard");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to login. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF9F4] text-[#171717]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <section className="hidden bg-[#171717] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <Logo className="[&_*]:text-white" />

          <div className="max-w-xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              Welcome Back
            </p>

            <h1 className="font-serif text-5xl font-semibold leading-tight xl:text-6xl">
              Your legal journey,
              <span className="block text-[#C9A227]">
                continues here.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-sm leading-7 text-[#BDB8AE]">
              Access your cases, connect with your lawyer,
              manage documents, appointments, payments, and
              everything related to your legal journey.
            </p>
          </div>

          <div className="border-t border-[#3A3A3A] pt-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#77716A]">
              Vakilo — Legal Platform
            </p>
          </div>
        </section>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <section className="flex min-h-screen items-center justify-center px-6 py-12 md:px-10">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}

            <div className="mb-12 lg:hidden">
              <Logo />
            </div>

            <div className="mb-9">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
                Account Access
              </p>

              <h2 className="font-serif text-4xl font-semibold">
                Sign in to Vakilo
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#66615A]">
                Enter your details to continue to your
                account.
              </p>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* =================================================
                LOGIN FORM
            ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Email */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="h-13 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Password */}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    disabled={loading}
                    className="text-xs font-medium text-[#8A6D1D] hover:underline disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="h-13 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="h-13 w-full bg-[#171717] px-6 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Signing In..."
                  : "Sign In"}
              </button>
            </form>

            {/* Divider */}

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#DED7CA]" />

              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A847B]">
                New to Vakilo?
              </span>

              <div className="h-px flex-1 bg-[#DED7CA]" />
            </div>

            {/* Signup */}

            <button
              type="button"
              onClick={() => navigate("/signup")}
              disabled={loading}
              className="h-13 w-full border border-[#BEB5A5] bg-transparent px-6 text-sm font-semibold uppercase tracking-[0.15em] text-[#171717] transition hover:border-[#C9A227] hover:text-[#8A6D1D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create an Account
            </button>

            <p className="mt-8 text-center text-xs leading-5 text-[#77716A]">
              By continuing, you agree to Vakilo's terms of
              service and privacy policy.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
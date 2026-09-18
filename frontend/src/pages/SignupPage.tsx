import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth, type UserRole } from "../context/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] =
    useState<UserRole>("client");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName =
      fullName.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPhone =
      phone.trim();


    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!cleanName) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }


    setLoading(true);


    try {

      /* =====================================================
         REGISTER
      ===================================================== */

      const currentUser = await register({
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        role,
      });


      /* =====================================================
         SUCCESS
      ===================================================== */

      setSuccess(
        "Account created successfully."
      );


      /* =====================================================
         REDIRECT
      ===================================================== */

      if (
        currentUser.role ===
        "lawyer"
      ) {

        navigate(
          "/lawyer/dashboard",
          {
            replace: true,
          }
        );

      } else if (
        currentUser.role ===
        "admin"
      ) {

        navigate(
          "/admin/dashboard",
          {
            replace: true,
          }
        );

      } else {

        navigate(
          "/client/dashboard",
          {
            replace: true,
          }
        );

      }

    } catch (err) {

      console.error(
        "Signup error:",
        err
      );


      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Unable to create account. Please try again."
        );

      }

    } finally {

      setLoading(false);

    }

  };


  /* =========================================================
     SIGN IN
  ========================================================= */

  const handleSignIn =
    () => {

      navigate(
        "/login"
      );

    };


  /* =========================================================
     UI
  ========================================================= */

  return (

    <main className="min-h-screen bg-[#FBF9F4] text-[#171717]">

      <div className="grid min-h-screen lg:grid-cols-2">


        {/* ===================================================
            LEFT
        =================================================== */}

        <section className="hidden bg-[#171717] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">

          <Logo className="[&_*]:text-white" />


          <div className="max-w-xl">

            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              Join Vakilo
            </p>


            <h1 className="font-serif text-5xl font-semibold leading-tight xl:text-6xl">

              A simpler way

              <span className="block text-[#C9A227]">
                to navigate law.
              </span>

            </h1>


            <p className="mt-6 max-w-lg text-sm leading-7 text-[#BDB8AE]">

              Create your Vakilo account and
              take control of your legal journey —
              from finding the right lawyer to
              managing your case.

            </p>


            <div className="mt-10 grid grid-cols-2 border-t border-[#3A3A3A]">

              <div className="border-r border-[#3A3A3A] py-6 pr-6">

                <span className="font-serif text-3xl text-[#C9A227]">
                  01
                </span>

                <p className="mt-2 text-xs uppercase tracking-wider text-[#A9A49B]">
                  Simple
                </p>

              </div>


              <div className="py-6 pl-6">

                <span className="font-serif text-3xl text-[#C9A227]">
                  02
                </span>

                <p className="mt-2 text-xs uppercase tracking-wider text-[#A9A49B]">
                  Secure
                </p>

              </div>

            </div>

          </div>


          <div className="border-t border-[#3A3A3A] pt-5">

            <p className="text-xs uppercase tracking-[0.18em] text-[#77716A]">
              Vakilo — Legal Platform
            </p>

          </div>

        </section>


        {/* ===================================================
            RIGHT
        =================================================== */}

        <section className="flex min-h-screen items-center justify-center px-6 py-12 md:px-10">

          <div className="w-full max-w-md">


            {/* MOBILE LOGO */}

            <div className="mb-10 lg:hidden">

              <Logo />

            </div>


            {/* HEADER */}

            <div className="mb-8">

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
                Create Account
              </p>

              <h2 className="font-serif text-4xl font-semibold">
                Join Vakilo
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#66615A]">
                Create your account to get started.
              </p>

            </div>


            {/* ERROR */}

            {error && (

              <div className="mb-5 flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                <p className="whitespace-pre-line">
                  {error}
                </p>


                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="shrink-0 underline"
                >
                  Dismiss
                </button>

              </div>

            )}


            {/* SUCCESS */}

            {success && (

              <div className="mb-5 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

                {success}

              </div>

            )}


            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4"
            >


              {/* FULL NAME */}

              <div>

                <label
                  htmlFor="fullName"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Full Name
                </label>


                <input
                  id="fullName"
                  type="text"
                  value={
                    fullName
                  }
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:bg-[#F0EBE1]"
                />

              </div>


              {/* EMAIL */}

              <div>

                <label
                  htmlFor="signupEmail"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Email Address
                </label>


                <input
                  id="signupEmail"
                  type="email"
                  value={
                    email
                  }
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:bg-[#F0EBE1]"
                />

              </div>


              {/* PHONE */}

              <div>

                <label
                  htmlFor="phone"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Phone Number
                </label>


                <input
                  id="phone"
                  type="tel"
                  value={
                    phone
                  }
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:bg-[#F0EBE1]"
                />

              </div>


              {/* ROLE */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">

                  I am joining as

                </label>


                <div className="grid grid-cols-2 gap-3">


                  {/* CLIENT */}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setRole(
                        "client"
                      )
                    }
                    className={`border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                      role ===
                      "client"
                        ? "border-[#C9A227] bg-[#F1ECE2] text-[#8A6D1D]"
                        : "border-[#CEC6B8] bg-white text-[#55504A] hover:border-[#B4AA99]"
                    }`}
                  >
                    Client
                  </button>


                  {/* LAWYER */}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setRole(
                        "lawyer"
                      )
                    }
                    className={`border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                      role ===
                      "lawyer"
                        ? "border-[#C9A227] bg-[#F1ECE2] text-[#8A6D1D]"
                        : "border-[#CEC6B8] bg-white text-[#55504A] hover:border-[#B4AA99]"
                    }`}
                  >
                    Lawyer
                  </button>

                </div>

              </div>


              {/* PASSWORD */}

              <div>

                <label
                  htmlFor="signupPassword"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Password
                </label>


                <input
                  id="signupPassword"
                  type="password"
                  value={
                    password
                  }
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:bg-[#F0EBE1]"
                />

              </div>


              {/* CONFIRM PASSWORD */}

              <div>

                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Confirm Password
                </label>


                <input
                  id="confirmPassword"
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none transition focus:border-[#C9A227] disabled:cursor-not-allowed disabled:bg-[#F0EBE1]"
                />

              </div>


              {/* CREATE ACCOUNT */}

              <button
                type="submit"
                disabled={
                  loading
                }
                className="mt-3 h-13 w-full bg-[#171717] px-6 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading
                  ? "Creating Account..."
                  : "Create Account"}

              </button>

            </form>


            {/* SIGN IN */}

            <div className="my-7 flex items-center gap-4">

              <div className="h-px flex-1 bg-[#DED7CA]" />

              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A847B]">
                Already registered?
              </span>

              <div className="h-px flex-1 bg-[#DED7CA]" />

            </div>


            <button
              type="button"
              onClick={
                handleSignIn
              }
              className="h-13 w-full border border-[#BEB5A5] bg-transparent px-6 text-sm font-semibold uppercase tracking-[0.15em] text-[#171717] transition hover:border-[#C9A227] hover:text-[#8A6D1D]"
            >
              Sign In
            </button>


            {/* TERMS */}

            <p className="mt-7 text-center text-xs leading-5 text-[#77716A]">

              By creating an account, you agree to
              Vakilo's terms of service and privacy
              policy.

            </p>

          </div>

        </section>

      </div>

    </main>
  );
}
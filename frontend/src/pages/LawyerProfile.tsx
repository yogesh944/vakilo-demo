import {
  ArrowLeft,
  CheckCircle2,
  Save,
  ShieldCheck,
  Star,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";


// ==========================================================
// TYPES
// ==========================================================

interface LawyerProfileData {
  id: number;
  user_id: number;

  full_name: string;
  email: string;
  phone: string | null;

  bar_registration_number: string;
  specialization: string;
  experience_years: number;
  consultation_fee: number | null;

  city: string | null;
  state: string | null;
  languages: string | null;
  bio: string | null;

  is_available: boolean;
  is_verified: boolean;

  rating: number;
  total_reviews: number;
}


// ==========================================================
// COMPONENT
// ==========================================================

export default function LawyerProfile() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // ========================================================
  // STATE
  // ========================================================

  const [profile, setProfile] =
    useState<LawyerProfileData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ========================================================
  // FORM
  // ========================================================

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [specialization, setSpecialization] =
    useState("");

  const [experienceYears, setExperienceYears] =
    useState("0");

  const [consultationFee, setConsultationFee] =
    useState("");

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState("");

  const [languages, setLanguages] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [isAvailable, setIsAvailable] =
    useState(true);

  // True when this lawyer does not have a profile yet.
  const [isCreating, setIsCreating] =
    useState(false);


  // ========================================================
  // LOAD PROFILE
  // ========================================================

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setError("");

        const data =
          await apiRequest<LawyerProfileData>(
            "/lawyers/profile",
            {
              token,
            }
          );

        setProfile(data);

        setFullName(data.full_name);
        setEmail(data.email);
        setPhone(data.phone ?? "");

        setSpecialization(
          data.specialization
        );

        setExperienceYears(
          String(data.experience_years ?? 0)
        );

        setConsultationFee(
          data.consultation_fee !== null
            ? String(data.consultation_fee)
            : ""
        );

        setCity(data.city ?? "");
        setState(data.state ?? "");
        setLanguages(
          data.languages ?? ""
        );

        setBio(data.bio ?? "");

        setIsAvailable(
          data.is_available
        );

      } catch (err) {
        const message =
          err instanceof Error ? err.message : "";

        // A new lawyer may not have a LawyerProfile row yet.
        // Treat the backend 404 as "create profile" instead
        // of showing "Lawyer profile not found".
        if (
          message.toLowerCase().includes("profile not found") ||
          message.toLowerCase().includes("404")
        ) {
          setProfile({
            id: 0,
            user_id: user?.id ?? 0,
            full_name: user?.full_name ?? "",
            email: user?.email ?? "",
            phone: user?.phone ?? null,
            bar_registration_number: "",
            specialization: "",
            experience_years: 0,
            consultation_fee: null,
            city: null,
            state: null,
            languages: null,
            bio: null,
            is_available: true,
            is_verified: false,
            rating: 0,
            total_reviews: 0,
          });

          setFullName(user?.full_name ?? "");
          setEmail(user?.email ?? "");
          setPhone(user?.phone ?? "");

          setIsCreating(true);
          setError("");
        } else {
          setError(
            message ||
              "Unable to load your lawyer profile."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [token, user]);


  // ========================================================
  // SAVE PROFILE
  // ========================================================

  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!token) {
      setError(
        "You are not authenticated."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    if (
      isCreating &&
      (profile?.bar_registration_number?.trim().length ?? 0) < 2
    ) {
      setError("Please enter your Bar Council Registration Number.");
      setSaving(false);
      return;
    }

    try {
      // ====================================================
      // CREATE PROFILE
      // ====================================================
      if (isCreating) {
        const created =
          await apiRequest<LawyerProfileData>(
            "/lawyers/profile",
            {
              method: "POST",
              token,
              body: {
                bar_registration_number:
                  profile?.bar_registration_number?.trim() || "",
                specialization:
                  specialization.trim(),
                experience_years:
                  Number(experienceYears),
                consultation_fee:
                  consultationFee.trim()
                    ? Number(consultationFee)
                    : null,
                city:
                  city.trim() || null,
                state:
                  state.trim() || null,
                languages:
                  languages.trim() || null,
                bio:
                  bio.trim() || null,
              },
            }
          );

        setProfile(created);
        setIsCreating(false);

        setFullName(created.full_name ?? fullName);
        setEmail(created.email ?? email);
        setPhone(created.phone ?? phone);
        setIsAvailable(created.is_available ?? true);

        setSuccess(
          "Your lawyer profile has been created successfully."
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      // ====================================================
      // UPDATE EXISTING PROFILE
      // ====================================================
      const updated =
        await apiRequest<LawyerProfileData>(
          "/lawyers/profile",
          {
            method: "PUT",
            token,
            body: {
              full_name: fullName.trim(),
              email: email.trim(),
              phone:
                phone.trim() || null,
              specialization:
                specialization.trim(),
              experience_years:
                Number(experienceYears),
              consultation_fee:
                consultationFee.trim()
                  ? Number(consultationFee)
                  : null,
              city:
                city.trim() || null,
              state:
                state.trim() || null,
              languages:
                languages.trim() || null,
              bio:
                bio.trim() || null,
              is_available:
                isAvailable,
            },
          }
        );

      setProfile(updated);

      setSuccess(
        "Your profile has been updated successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to update your profile."
        );
      }
    } finally {
      setSaving(false);
    }
  };


  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F0E8]">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />

          <p className="mt-4 text-sm text-[#77716A]">
            Loading your profile...
          </p>

        </div>

      </main>
    );
  }


  // ========================================================
  // PAGE
  // ========================================================

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() =>
                navigate("/lawyer/dashboard")
              }
              className="flex h-10 w-10 items-center justify-center border border-[#D7CFBF] transition hover:bg-[#F0EBE1]"
            >
              <ArrowLeft size={18} />
            </button>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Lawyer Portal
              </p>

              <h1 className="font-serif text-xl font-semibold">
                Professional Profile
              </h1>

            </div>

          </div>

        </div>

      </header>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 lg:py-10">

        {/* ==================================================
            TITLE
        ================================================== */}

        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            Profile Management
          </p>

          <h2 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">
            Your professional profile
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66615A]">
            Keep your professional information
            accurate so clients and the lawyer
            recommendation system can find the
            right match for your cases.
          </p>

        </div>


        {/* ==================================================
            ALERTS
        ================================================== */}

        {error && (

          <div className="mb-5 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>

        )}

        {success && (

          <div className="mb-5 flex items-center gap-2 border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">

            <CheckCircle2 size={17} />

            {success}

          </div>

        )}


        {/* ==================================================
            PROFILE STATUS
        ================================================== */}

        <section className="mb-6 grid gap-4 md:grid-cols-3">

          {/* Verification */}

          <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

            <ShieldCheck
              size={21}
              className="text-[#8A6D1D]"
            />

            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#8A847B]">
              Verification
            </p>

            <p className="mt-1 font-serif text-lg font-semibold">

              {isCreating
                ? "Not Created"
                : profile?.is_verified
                  ? "Verified"
                  : "Verification Pending"}

            </p>

          </div>


          {/* Rating */}

          <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

            <Star
              size={21}
              className="text-[#8A6D1D]"
            />

            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#8A847B]">
              Rating
            </p>

            <p className="mt-1 font-serif text-lg font-semibold">

              {isCreating
                ? "—"
                : profile?.rating?.toFixed(1) ?? "0.0"}

              {!isCreating && (
                <span className="ml-2 text-xs font-normal text-[#77716A]">
                  ({profile?.total_reviews ?? 0} reviews)
                </span>
              )}

            </p>

          </div>


          {/* Availability */}

          <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

            <div
              className={`h-3 w-3 rounded-full ${
                isAvailable
                  ? "bg-green-600"
                  : "bg-red-500"
              }`}
            />

            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#8A847B]">
              Availability
            </p>

            <p className="mt-1 font-serif text-lg font-semibold">

              {isAvailable
                ? "Available"
                : "Unavailable"}

            </p>

          </div>

        </section>


        {/* ==================================================
            FORM
        ================================================== */}

        <form
          onSubmit={handleSave}
          className="space-y-6"
        >

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Personal Information
              </p>

              <h3 className="mt-1 font-serif text-xl font-semibold">
                Basic details
              </h3>

            </div>


            <div className="grid gap-5 p-6 md:grid-cols-2">

              {/* Full name */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Full Name
                </label>

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  required
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>


              {/* Email */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  required
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>


              {/* Phone */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Phone
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="+91 9876543210"
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>

            </div>

          </section>


          {/* =================================================
              PROFESSIONAL INFORMATION
          ================================================= */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Professional Information
              </p>

              <h3 className="mt-1 font-serif text-xl font-semibold">
                Legal practice
              </h3>

            </div>


            <div className="grid gap-5 p-6 md:grid-cols-2">

              {/* Bar registration */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Bar Council Registration Number
                </label>

                <input
                  value={
                    profile?.bar_registration_number ??
                    ""
                  }
                  onChange={(event) => {
                    if (!isCreating) return;

                    setProfile((current) => ({
                      ...(current ?? {
                        id: 0,
                        user_id: 0,
                        full_name: fullName,
                        email,
                        phone: phone || null,
                        bar_registration_number: "",
                        specialization: "",
                        experience_years: 0,
                        consultation_fee: null,
                        city: null,
                        state: null,
                        languages: null,
                        bio: null,
                        is_available: true,
                        is_verified: false,
                        rating: 0,
                        total_reviews: 0,
                      }),
                      bar_registration_number:
                        event.target.value,
                    }));
                  }}
                  disabled={!isCreating}
                  required={isCreating}
                  placeholder={
                    isCreating
                      ? "Enter your bar registration number"
                      : ""
                  }
                  className={`h-12 w-full border border-[#CEC6B8] px-4 text-sm outline-none focus:border-[#C9A227] ${
                    isCreating
                      ? "bg-white"
                      : "cursor-not-allowed bg-[#F0ECE4] text-[#77716A]"
                  }`}
                />

                <p className="mt-2 text-[11px] text-[#8A847B]">
                  {isCreating
                    ? "Required to create your lawyer profile."
                    : "Contact an administrator if your registration number needs to be changed."}
                </p>

              </div>


              {/* Specialization */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Specialization
                </label>

                <input
                  value={specialization}
                  onChange={(event) =>
                    setSpecialization(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Criminal Law"
                  required
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>


              {/* Experience */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Experience (Years)
                </label>

                <input
                  type="number"
                  min="0"
                  value={experienceYears}
                  onChange={(event) =>
                    setExperienceYears(
                      event.target.value
                    )
                  }
                  required
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>


              {/* Fee */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Consultation Fee
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={consultationFee}
                  onChange={(event) =>
                    setConsultationFee(
                      event.target.value
                    )
                  }
                  placeholder="1500"
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>

            </div>

          </section>


          {/* =================================================
              LOCATION
          ================================================= */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Location & Languages
              </p>

              <h3 className="mt-1 font-serif text-xl font-semibold">
                Client accessibility
              </h3>

            </div>


            <div className="grid gap-5 p-6 md:grid-cols-2">

              {/* City */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  City
                </label>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  placeholder="Delhi"
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>


              {/* State */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  State
                </label>

                <input
                  value={state}
                  onChange={(event) =>
                    setState(
                      event.target.value
                    )
                  }
                  placeholder="Delhi"
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

              </div>


              {/* Languages */}

              <div className="md:col-span-2">

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Languages
                </label>

                <input
                  value={languages}
                  onChange={(event) =>
                    setLanguages(
                      event.target.value
                    )
                  }
                  placeholder="English, Hindi, Marathi"
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
                />

                <p className="mt-2 text-[11px] text-[#8A847B]">
                  Separate multiple languages
                  with commas.
                </p>

              </div>

            </div>

          </section>


          {/* =================================================
              BIO
          ================================================= */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                About
              </p>

              <h3 className="mt-1 font-serif text-xl font-semibold">
                Professional biography
              </h3>

            </div>


            <div className="p-6">

              <textarea
                value={bio}
                onChange={(event) =>
                  setBio(
                    event.target.value
                  )
                }
                rows={6}
                placeholder="Tell clients about your legal experience, areas of practice, professional background, and approach..."
                className="w-full resize-y border border-[#CEC6B8] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#C9A227]"
              />

            </div>

          </section>


          {/* =================================================
              AVAILABILITY
          ================================================= */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                  Practice Status
                </p>

                <h3 className="mt-1 font-serif text-xl font-semibold">
                  Available for new cases
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#77716A]">
                  When enabled, clients can see
                  you as an available lawyer for
                  relevant cases.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setIsAvailable(
                    (current) => !current
                  )
                }
                className={`relative h-7 w-14 shrink-0 rounded-full transition ${
                  isAvailable
                    ? "bg-[#C9A227]"
                    : "bg-[#A39B8E]"
                }`}
                aria-label="Toggle availability"
              >

                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    isAvailable
                      ? "left-8"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

          </section>


          {/* =================================================
              SAVE
          ================================================= */}

          <div className="flex flex-col gap-3 border-t border-[#D7CFBF] pt-6 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/lawyer/dashboard"
                )
              }
              className="border border-[#BEB5A5] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#55504A] transition hover:border-[#C9A227]"
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-[#171717] px-7 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-60"
            >

              <Save size={15} />

              {saving
                ? isCreating
                  ? "Creating..."
                  : "Saving..."
                : isCreating
                  ? "Create Profile"
                  : "Save Changes"}

            </button>

          </div>

        </form>

      </div>

    </main>
  );
}
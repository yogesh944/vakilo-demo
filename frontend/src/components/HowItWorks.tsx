const steps = [
  {
    number: "01",
    title: "Tell Us Your Problem",
    description:
      "Share your legal concern through our simple guided process.",
  },
  {
    number: "02",
    title: "Get Legal Guidance",
    description:
      "Understand your situation and explore the right legal path.",
  },
  {
    number: "03",
    title: "Find the Right Lawyer",
    description:
      "Connect with a suitable lawyer based on your case and requirements.",
  },
  {
    number: "04",
    title: "Resolve Your Case",
    description:
      "Manage appointments, documents, communication, and your case journey in one place.",
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full bg-[#171717] px-6 py-20 text-white md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
            How It Works
          </p>

          <h2 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">
            Legal help, made simpler.
          </h2>

          <p className="mt-5 text-sm leading-7 text-[#C8C4BC] md:text-base">
            From understanding your legal issue to connecting
            with the right professional, Vakilo brings the
            entire journey together.
          </p>
        </div>

        <div className="grid gap-0 border-t border-[#3A3A3A] md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="border-b border-[#3A3A3A] p-7 transition hover:bg-[#202020] md:border-r lg:min-h-[280px]"
            >
              <span className="font-serif text-4xl text-[#C9A227]">
                {step.number}
              </span>

              <h3 className="mt-8 font-serif text-xl font-semibold">
                {step.title}
              </h3>

              <p className="mt-4 text-sm leading-6 text-[#AAA59C]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
import { useState } from "react";

interface CNRSearchWidgetProps {
  onSearch?: (cnrNumber: string) => void;
}

export default function CNRSearchWidget({
  onSearch,
}: CNRSearchWidgetProps) {
  const [cnrNumber, setCnrNumber] = useState("");

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const value = cnrNumber.trim();

    if (!value) {
      return;
    }

    if (onSearch) {
      onSearch(value);
    } else {
      console.log("CNR Search:", value);
    }
  };

  return (
    <section className="w-full border border-[#D8D1C2] bg-[#F8F5EE] p-6">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
          Case Tracking
        </p>

        <h2 className="font-serif text-2xl font-semibold text-[#171717]">
          Search Your Case
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#66615A]">
          Enter your CNR number to check the latest status
          of your court case.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          value={cnrNumber}
          onChange={(event) =>
            setCnrNumber(event.target.value)
          }
          placeholder="Enter CNR number"
          className="min-h-12 flex-1 border border-[#CFC7B8] bg-white px-4 text-sm text-[#171717] outline-none transition focus:border-[#C9A227]"
        />

        <button
          type="submit"
          className="min-h-12 bg-[#171717] px-6 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#2A2A2A]"
        >
          Search Case
        </button>
      </form>
    </section>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";

type SearchSuggestion = {
  label: string;
};

export function PublicSearchForm() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(async () => {
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set("q", query.trim());
      }

      const response = await fetch(`/api/search/suggestions?${params.toString()}`);

      if (response.ok) {
        const payload = await response.json() as { suggestions?: SearchSuggestion[] };
        setSuggestions(payload.suggestions ?? []);
      }
    }, 120);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  return (
    <div className="relative w-[684px]">
      <form action="/animals" autoComplete="off" className={`ml-auto flex h-10 min-w-0 overflow-hidden rounded-full border bg-[#121212] transition-[width,border-color] duration-200 ${isFocused ? "w-[684px] border-[#3ea6ff]" : "w-[640px] border-white/15"}`}>
        <div className={`grid place-items-center overflow-hidden text-shelter-ink/70 transition-[width,opacity] duration-200 ${isFocused ? "w-11 opacity-100" : "w-0 opacity-0"}`}>
          <SearchIcon className="h-5 w-5" />
        </div>
        <input
          name="q"
          type="text"
          value={query}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Введите запрос"
          className={`min-w-0 flex-1 bg-transparent text-sm text-shelter-ink outline-none placeholder:text-shelter-ink/45 ${isFocused ? "pr-5" : "px-5"}`}
        />
        <button
          type="submit"
          aria-label="Поиск"
          className="grid w-16 place-items-center border-l border-white/15 bg-white/10 transition hover:bg-white/15"
        >
          <SearchIcon className="h-6 w-6" />
        </button>
      </form>
      {isFocused && suggestions.length ? (
        <div className="absolute left-0 right-16 top-11 z-40 overflow-hidden rounded-xl bg-[#212121] py-2 shadow-2xl">
          {suggestions.map((suggestion) => (
            <a
              key={suggestion.label}
              href={`/animals?q=${encodeURIComponent(suggestion.label)}`}
              className="flex items-center gap-4 px-5 py-2.5 text-sm font-medium text-shelter-ink hover:bg-white/10"
            >
              <span className="text-lg text-shelter-ink/70">⌕</span>
              {suggestion.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="m15.5 15.5 4.2 4.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

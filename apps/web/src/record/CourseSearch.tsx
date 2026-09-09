import { useId, useMemo, useRef, useState } from "react";
import { courseKey } from "@gradguide/shared";
import type { Course } from "@gradguide/shared";
import { search, type CourseIndex } from "./courseIndex.ts";
import { ATTRIBUTE_LABEL } from "./attributeLabels.ts";

/**
 * An ARIA combobox, built by hand because the interaction is the product: a
 * student with 32 courses to enter should never need the mouse.
 *
 * Pattern per the frontend-a11y skill: role=combobox on the input with
 * aria-expanded / aria-controls / aria-activedescendant, a listbox of options,
 * arrow keys to move, Enter to commit, Escape to close. The active option is
 * referenced by id rather than focused, so the caret stays in the input.
 */
export function CourseSearch({
  index,
  onSelect,
  label = "Add a course",
  placeholder = "Type a course code or title, e.g. CSCI 051",
  compact = false,
}: {
  index: CourseIndex;
  onSelect: (course: Course) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const listId = useId();

  const results = useMemo(() => search(index, query), [index, query]);
  const isOpen = open && results.length > 0;

  const commit = (course: Course | undefined) => {
    if (!course) return;
    onSelect(course);
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (isOpen) {
        e.preventDefault();
        commit(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`course-search${compact ? " course-search-compact" : ""}`}>
      <label htmlFor={inputId} className={compact ? "sr-only" : undefined}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />

      <ul id={listId} role="listbox" aria-label="Matching courses" className="search-results" hidden={!isOpen}>
        {results.map((course, i) => (
          <li
            key={courseKey(course.id)}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`search-option${i === active ? " is-active" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              commit(course);
            }}
            onMouseEnter={() => setActive(i)}
          >
            <span className="course-code">{courseKey(course.id)}</span>
            <span className="search-title">{course.title}</span>
            {course.attributes.length > 0 && (
              <span className="chips">
                {course.attributes.map((a) => (
                  <span key={a} className="chip">{ATTRIBUTE_LABEL[a]}</span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Screen readers get the result count without the list stealing focus. */}
      <p className="sr-only" role="status">
        {query.trim() === "" ? "" : `${results.length} matching ${results.length === 1 ? "course" : "courses"}`}
      </p>
    </div>
  );
}

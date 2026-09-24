import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useCheckout } from "../hooks/useCheckout";
import { CheckoutNotice } from "../components/CheckoutNotice";
import { CourseCard, CourseCardSkeleton } from "../components/CourseCard";
import { fetchOwnedCourseIds, fetchPublishedCourses, type CatalogCourse } from "../lib/catalog";
import { IconSearch } from "../components/Icons";

type Filter = "all" | "available" | "purchased";

export function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const checkout = useCheckout();

  useEffect(() => {
    (async () => {
      setCourses(await fetchPublishedCourses());
      if (user) setOwnedIds(await fetchOwnedCourseIds(user.id));
      else setOwnedIds(new Set());
      setLoading(false);
    })();
  }, [user?.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (filter === "available" && ownedIds.has(c.id)) return false;
      if (filter === "purchased" && !ownedIds.has(c.id)) return false;
      if (!q) return true;
      return [c.title, c.short_description, c.description, ...c.stats.subjects]
        .filter(Boolean)
        .some((t) => (t as string).toLowerCase().includes(q));
    });
  }, [courses, ownedIds, query, filter]);

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All courses", count: courses.length },
    { id: "available", label: "Not purchased", count: courses.filter((c) => !ownedIds.has(c.id)).length },
    { id: "purchased", label: "Purchased", count: courses.filter((c) => ownedIds.has(c.id)).length },
  ];

  return (
    <div>
      <section className="border-b border-line bg-white">
        <div className="page py-10 sm:py-12">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">All courses</h1>
          <p className="mt-2 max-w-xl text-ink/65">
            Every course on BS Creation. You can own as many as you like — each one is added to your account separately.
          </p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="relative block w-full md:max-w-sm">
              <span className="sr-only">Search courses</span>
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by course or subject"
                className="input pl-10"
              />
            </label>
            {user && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0" role="tablist">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={filter === t.id}
                    onClick={() => setFilter(t.id)}
                    className={`btn-sm btn shrink-0 border ${
                      filter === t.id ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-ink/75 hover:border-brand-300"
                    }`}
                  >
                    {t.label} <span className={filter === t.id ? "text-white/70" : "text-ink/40"}>{t.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="page py-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ink/60">No courses are published yet.</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
            <p className="text-ink/70">No courses match your search.</p>
            <button onClick={() => { setQuery(""); setFilter("all"); }} className="btn-secondary mt-4">Show all courses</button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                stats={c.stats}
                owned={ownedIds.has(c.id)}
                onBuy={checkout.buy}
                buying={checkout.buyingId === c.id}
              />
            ))}
          </div>
        )}
      </section>
      <CheckoutNotice error={checkout.error} status={checkout.statusMsg} />
    </div>
  );
}

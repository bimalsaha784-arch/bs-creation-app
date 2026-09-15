import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminCourseCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [instructor, setInstructor] = useState("");
  const [duration, setDuration] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("courses")
      .insert({
        title,
        slug: slugify(title),
        short_description: shortDescription,
        description,
        price: Number(price),
        discount_price: discountPrice ? Number(discountPrice) : null,
        instructor_name: instructor,
        duration,
        level,
        status: "draft",
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/admin/courses/${data.id}/edit`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Create Course</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input required placeholder="Course title" value={title} onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
        <input placeholder="Short description (for course cards)" value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
        <textarea placeholder="Full description" value={description} onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 text-sm" rows={4} />
        <div className="grid grid-cols-2 gap-4">
          <input required type="number" min="0" placeholder="Price (₹)" value={price}
            onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
          <input type="number" min="0" placeholder="Discount price (optional)" value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <input placeholder="Instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
          <input placeholder="Duration (e.g. 6 hours)" value={duration} onChange={(e) => setDuration(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving}
          className="rounded-full bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {saving ? "Saving…" : "Create Course (as draft)"}
        </button>
        <p className="text-xs text-slate-400">
          New courses start as drafts. Add modules, lessons, and a thumbnail on the edit page, then publish.
        </p>
      </form>
    </div>
  );
}

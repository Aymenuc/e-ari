"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, CheckCircle2, Mail, Building2, MessageSquare } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 mb-4">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="font-heading font-semibold text-foreground text-base mb-1">Message sent!</p>
        <p className="text-sm text-muted-foreground font-sans">We&apos;ll get back to you within 24 hours.</p>
        <button
          onClick={() => { setSent(false); setForm({ name: "", email: "", company: "", subject: "", message: "" }); }}
          className="mt-4 text-xs text-eari-blue-light hover:underline font-sans"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Input
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="bg-navy-700/60 border-border/60 font-sans text-sm placeholder:text-muted-foreground/50 focus:border-eari-blue/50 h-9"
          />
        </div>
        <div className="relative">
          <Input
            type="email"
            placeholder="Work email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="bg-navy-700/60 border-border/60 font-sans text-sm placeholder:text-muted-foreground/50 focus:border-eari-blue/50 h-9"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Company (optional)"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="bg-navy-700/60 border-border/60 font-sans text-sm placeholder:text-muted-foreground/50 focus:border-eari-blue/50 h-9"
        />
        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
          className="bg-navy-700/60 border-border/60 font-sans text-sm placeholder:text-muted-foreground/50 focus:border-eari-blue/50 h-9"
        />
      </div>
      <textarea
        placeholder="How can we help you?"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        required
        rows={4}
        className="w-full rounded-md border border-border/60 bg-navy-700/60 px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-eari-blue/30 focus:border-eari-blue/50 resize-none transition-colors"
      />
      {error && <p className="text-xs text-destructive font-sans">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans text-sm h-9 shadow-md shadow-eari-blue/15"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
        ) : (
          <><Send className="h-4 w-4 mr-2" />Send Message</>
        )}
      </Button>
    </form>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Facebook, Send, Heart, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const contactItems = [
  { icon: Phone, key: "phone", value: "01924997029", href: "tel:+8801924997029", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: MessageCircle, key: "whatsapp", value: "01650211825", href: "https://wa.me/8801650211825", color: "text-green-500", bg: "bg-green-500/10" },
  { icon: Facebook, key: "facebook", value: "Sadik Shah", href: "https://www.facebook.com/Sadik044", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Send, key: "telegram", value: "@Sadik044", href: "https://t.me/Sadik044", color: "text-sky-500", bg: "bg-sky-500/10" },
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export function ContactSection({ id = "contact" }: { id?: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(t("contact.sentError"));
      return;
    }
    toast.success(t("contact.sentSuccess"));
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <section id={id} className="container mx-auto px-6 py-24">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("contact.title")}</h2>
        <div className="h-4" /> {/* Extra spacing */}
        <p className="text-muted-foreground">
          {t("contact.sub")}
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactItems.map((c, i) => (
              <motion.a
                key={c.key}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${c.bg} ${c.color} transition-transform group-hover:scale-110`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t(`contact.${c.key}`)}</div>
                  <div className="truncate text-sm font-medium">{c.value}</div>
                </div>
              </motion.a>
            ))}
          </div>
          
          <div className="mt-8 flex justify-center">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {t("contact.builtWith")} <Heart className="h-4 w-4 fill-red-500 text-red-500" /> {t("contact.by")}{" "}
              <span className="font-medium text-foreground">Sadik Shah</span>
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 shadow-sm md:p-10"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">{t("contact.name")}</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("contact.namePlaceholder")}
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">{t("contact.email")}</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t("contact.emailPlaceholder")}
                maxLength={255}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">{t("contact.message")}</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t("contact.messagePlaceholder")}
                rows={5}
                maxLength={2000}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? t("contact.sending") : t("contact.send")}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
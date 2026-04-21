import Link from "next/link";
import Image from "next/image";
import { Store, Facebook } from "lucide-react";
import { AR } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";

const quickLinks = [
  { href: "/", label: AR.nav.home },
  { href: "/shops", label: AR.nav.shops },
  { href: "/products", label: AR.nav.products },
  { href: "/about", label: "عن المنصة (About)" },
];

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61582326296423", label: "Facebook" },
];

export function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Shopydash Logo" width={56} height={56} className="object-contain" />
              <span className="font-bold text-2xl" style={{ fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif", letterSpacing: "-1px" }}>Shopydash</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              {AR.footer.aboutText}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">{AR.footer.quickLinks}</h3>
            <nav className="flex flex-col gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">{AR.footer.contact}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {AR.footer.email}:
                </span>
                <br />
                info@shopydash.store
                <br />
                support@shopydash.store
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {AR.footer.address}:
                </span>
                <br />
                أبو حمص، البحيرة، مصر
              </p>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h3 className="font-semibold">{AR.footer.followUs}</h3>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {AR.app.name}. {AR.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}

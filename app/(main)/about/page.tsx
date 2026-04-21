import type { Metadata } from "next";
import AboutPage from "@/views/about";

const BASE_URL = "https://www.shopydash.store";

export const metadata: Metadata = {
  title: "عن شوبي داش | أفضل متجر إلكتروني بالقرب منك - أبو حمص",
  description:
    "اكتشف شوبي داش (Shopy Dash)، منصة التسوق المحلية الأولى في أبو حمص. تسوق طعام طازج، إلكترونيات، ملابس وأكثر. ابدأ البيع معنا اليوم.",
  keywords:
    "شوبي داش, أبو حمص, تسوق محلي, متجر إلكتروني, توصيل, بيع أون لاين, سوق محلي",
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: "عن شوبي داش | منصة التسوق المحلية",
    description:
      "تعرف على شوبي داش — منصتك المحلية في أبو حمص للتسوق السهل والسريع.",
    url: `${BASE_URL}/about`,
    type: "website",
  },
};

export default function Page() {
  return <AboutPage />;
}
